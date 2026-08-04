/**
 * Realtime event publisher adapter — Sprint 1.9.
 *
 * Broadcasts a persisted domain event on a per-aggregate channel. Outbound
 * only: a failure is logged and never fails the originating operation. The
 * channel itself is shared with the subscriber (see the channel registry), so
 * a client that publishes on a room also hears that room.
 */
import { logger } from "@/foundation/logging";
import type { RealtimeEventPublisher, StoredDomainEvent } from "@/repository";

import type { DataConnection } from "../connection";
import { acquireChannel, channelName } from "./realtime-channel-registry";

const MODULE = "events.realtime.outbound";

export function createSupabaseRealtimeEventPublisher(
  connection: DataConnection,
): RealtimeEventPublisher {
  const leases = new Map<string, ReturnType<typeof acquireChannel>>();

  return {
    async publish(event: StoredDomainEvent): Promise<void> {
      if (!connection.isAvailable()) return;
      const name = channelName(event.aggregateType, event.aggregateId);
      try {
        let lease = leases.get(name);
        if (!lease) {
          lease = acquireChannel(connection.client(), name);
          leases.set(name, lease);
        }
        // Sending before the join completes makes supabase-js fall back to the
        // REST endpoint, which peers do not reliably receive.
        await lease.joined;
        await lease.channel.send({
          type: "broadcast",
          event: event.eventName,
          // The envelope, unchanged: correlation and sequence travel with it.
          payload: event as unknown as Record<string, unknown>,
        });
      } catch (error) {
        logger.warn("Realtime publish failed", {
          module: MODULE,
          error,
          eventName: event.eventName,
        });
      }
    },

    async release(aggregateType: string, aggregateId: string): Promise<void> {
      const name = channelName(aggregateType, aggregateId);
      const lease = leases.get(name);
      if (!lease) return;
      leases.delete(name);
      lease.release(connection.client(), name);
    },
  };
}
