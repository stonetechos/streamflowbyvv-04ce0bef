/**
 * Realtime event subscriber adapter — Sprint 2.0.
 *
 * The inbound counterpart to the Sprint 1.9 publisher, on the same
 * per-aggregate channel naming. Payloads arrive as the neutral stored
 * envelope; anything malformed is dropped rather than trusted, because a
 * broadcast is a hint to re-read and never a state source (Foundation §4).
 */
import type { RealtimeChannel } from "@supabase/supabase-js";

import { logger } from "@/foundation/logging";
import type { RealtimeEventListener, RealtimeEventSubscriber, StoredDomainEvent } from "@/repository";

import type { DataConnection } from "../connection";

const MODULE = "events.realtime.inbound";

function channelName(aggregateType: string, aggregateId: string): string {
  return `sf:${aggregateType}:${aggregateId}`;
}

/** Accepts only payloads that carry the envelope fields a listener relies on. */
function asStoredEvent(payload: unknown): StoredDomainEvent | null {
  if (typeof payload !== "object" || payload === null) return null;
  const candidate = payload as Partial<StoredDomainEvent>;
  if (typeof candidate.eventName !== "string") return null;
  if (typeof candidate.aggregateId !== "string") return null;
  if (typeof candidate.sequence !== "number") return null;
  return candidate as StoredDomainEvent;
}

export function createSupabaseRealtimeEventSubscriber(
  connection: DataConnection,
): RealtimeEventSubscriber {
  return {
    async subscribe(
      aggregateType: string,
      aggregateId: string,
      listener: RealtimeEventListener,
    ): Promise<() => void> {
      if (!connection.isAvailable()) return () => undefined;

      let channel: RealtimeChannel | null = null;
      try {
        channel = connection
          .client()
          .channel(channelName(aggregateType, aggregateId), {
            config: { broadcast: { ack: false, self: false } },
          })
          .on("broadcast", { event: "*" }, (message) => {
            const event = asStoredEvent((message as { payload?: unknown }).payload);
            if (event) listener(event);
          });
        channel.subscribe();
      } catch (error) {
        logger.warn("Realtime subscribe failed", { module: MODULE, error, aggregateId });
        return () => undefined;
      }

      let released = false;
      return () => {
        if (released || !channel) return;
        released = true;
        void connection
          .client()
          .removeChannel(channel)
          .catch((error: unknown) =>
            logger.warn("Realtime unsubscribe failed", { module: MODULE, error }),
          );
      };
    },
  };
}
