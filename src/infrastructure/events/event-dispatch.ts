/**
 * Ordered, replay-safe dispatch support — Sprint 1.9.
 *
 * Two guarantees the sprint requires, in one place:
 *
 * 1. **Ordering.** Work for one aggregate runs strictly in the order it was
 *    enqueued. Different aggregates progress independently, so a slow room
 *    cannot stall another.
 * 2. **Replay safety.** A key seen before is skipped, so re-delivery of the
 *    same envelope (retry, reconnect, rehydration) performs one write.
 *
 * Vendor-free: this module knows nothing about the store or the transport.
 */
import { logger } from "@/foundation/logging";

export interface OrderedDispatcher {
  /** Queues work behind everything already queued for `key`. */
  enqueue(key: string, task: () => Promise<void>): void;
  /** Resolves when every queued task has settled. Test and shutdown support. */
  drain(): Promise<void>;
  readonly pending: number;
}

export function createOrderedDispatcher(module: string): OrderedDispatcher {
  const chains = new Map<string, Promise<void>>();
  let pending = 0;

  return {
    get pending() {
      return pending;
    },

    enqueue(key, task) {
      pending += 1;
      const previous = chains.get(key) ?? Promise.resolve();
      const next = previous
        .then(task)
        .catch((error: unknown) => {
          // A projection failure must never break the publisher (Foundation §4).
          logger.error("Event subscriber task failed", { module, error });
        })
        .finally(() => {
          pending -= 1;
          if (chains.get(key) === next) chains.delete(key);
        });
      chains.set(key, next);
    },

    async drain() {
      while (chains.size > 0) {
        await Promise.all([...chains.values()]);
      }
    },
  };
}

export interface ReplayGuard {
  /** True the first time a key is seen; false for a replay. */
  admit(key: string): boolean;
  reset(): void;
}

/** Bounded FIFO memory of applied keys; oldest entries are evicted first. */
export function createReplayGuard(capacity = 2000): ReplayGuard {
  const seen = new Set<string>();
  return {
    admit(key) {
      if (seen.has(key)) return false;
      seen.add(key);
      if (seen.size > capacity) {
        const oldest = seen.values().next();
        if (!oldest.done) seen.delete(oldest.value);
      }
      return true;
    },
    reset: () => seen.clear(),
  };
}

/** Stable identity of one envelope: aggregate + event + sequence. */
export function eventKey(event: {
  aggregateType: string;
  aggregateId: string;
  eventName: string;
  sequence: number;
}): string {
  return `${event.aggregateType}:${event.aggregateId}:${event.eventName}:${event.sequence}`;
}
