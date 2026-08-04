/**
 * Realtime event subscriber adapter — Sprint 2.0.
 *
 * The inbound counterpart to the Sprint 1.9 publisher, on the same
 * per-aggregate channel (shared through the channel registry). Payloads arrive
 * as the neutral stored envelope; anything malformed is dropped rather than
 * trusted, because a broadcast is a hint to re-read and never a state source
 * (Foundation §4).
 */
import { logger } from "@/foundation/logging";
import type {
  RealtimeEventListener,
  RealtimeEventSubscriber,
  StoredDomainEvent,
} from "@/repository";

import type { DataConnection } from "../connection";
import { acquireChannel, channelName } from "./realtime-channel-registry";

const MODULE = "events.realtime.inbound";

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

      const name = channelName(aggregateType, aggregateId);
      let released = false;
      let lease: ReturnType<typeof acquireChannel>;
      try {
        lease = acquireChannel(connection.client(), name, (channel) => {
          channel.on("broadcast", { event: "*" }, (message) => {
            logger.warn("RT recv", { module: MODULE, name, message: JSON.stringify(message).slice(0,120) });
            if (released) return;
            const event = asStoredEvent((message as { payload?: unknown }).payload);
            if (event) listener(event);
          });
        });
      } catch (error) {
        logger.warn("Realtime subscribe failed", { module: MODULE, error, aggregateId });
        return () => undefined;
      }

      return () => {
        if (released) return;
        released = true;
        lease.release(connection.client(), name);
      };
    },
  };
}
