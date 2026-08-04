/**
 * Realtime event publisher adapter — Sprint 1.9.
 *
 * Broadcasts a persisted domain event on a per-aggregate channel. Outbound
 * only: this adapter never subscribes, and no layer above Infrastructure can
 * reach the transport. Channels are cached per aggregate and released
 * explicitly, so a long session does not accumulate sockets.
 *
 * Failure is logged, never thrown: realtime is a delivery optimization, not
 * the source of truth (Foundation §4).
 */
import type { RealtimeChannel } from "@supabase/supabase-js";

import { logger } from "@/foundation/logging";
import type { RealtimeEventPublisher, StoredDomainEvent } from "@/repository";

import type { DataConnection } from "../connection";

const MODULE = "events.realtime";

function channelName(aggregateType: string, aggregateId: string): string {
  return `sf:${aggregateType}:${aggregateId}`;
}

export function createSupabaseRealtimeEventPublisher(
  connection: DataConnection,
): RealtimeEventPublisher {
  const channels = new Map<string, RealtimeChannel>();

  const acquire = async (name: string): Promise<RealtimeChannel> => {
    const cached = channels.get(name);
    if (cached) return cached;

    const channel = connection.client().channel(name, {
      config: { broadcast: { ack: false, self: false } },
    });
    channels.set(name, channel);
    // Wait for the socket to actually join. Sending before the join completes
    // makes supabase-js fall back to the REST broadcast endpoint, which the
    // other members' websocket subscriptions do not reliably receive — the
    // lobby then never learns that somebody arrived. The wait is bounded so a
    // degraded transport delays a notice instead of blocking a mutation.
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 3000);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    return channel;
  };


  return {
    async publish(event: StoredDomainEvent): Promise<void> {
      if (!connection.isAvailable()) return;
      const name = channelName(event.aggregateType, event.aggregateId);
      try {
        const channel = await acquire(name);
        await channel.send({
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
      const channel = channels.get(name);
      if (!channel) return;
      channels.delete(name);
      try {
        await connection.client().removeChannel(channel);
      } catch (error) {
        logger.warn("Realtime channel release failed", { module: MODULE, error });
      }
    },
  };
}
