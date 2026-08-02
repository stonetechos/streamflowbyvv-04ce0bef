/**
 * domain_events persistence subscriber — Sprint 1.9.
 *
 * Firehose subscriber that appends every published envelope to the event
 * store. Append-only, ordered per aggregate, and replay-safe: the in-process
 * guard skips a re-delivered envelope, and the store itself reports
 * `duplicate` if one slips through (two tabs, a retried write).
 */
import type { CatalogEvent, EventBus, Unsubscribe } from "@/domain/events";
import { logger } from "@/foundation/logging";
import type { EventStoreRepository } from "@/repository";

import { createOrderedDispatcher, createReplayGuard, eventKey, type OrderedDispatcher } from "./event-dispatch";
import { toStoredEvent } from "./event-serializer";

export interface EventPersistenceSubscriberOptions {
  readonly bus: EventBus;
  readonly store: EventStoreRepository;
  readonly dispatcher?: OrderedDispatcher;
}

export function createEventPersistenceSubscriber(
  options: EventPersistenceSubscriberOptions,
): Unsubscribe {
  const dispatcher = options.dispatcher ?? createOrderedDispatcher("events.persistence");
  const guard = createReplayGuard();

  return options.bus.subscribeAll((event: CatalogEvent) => {
    const key = eventKey(event);
    if (!guard.admit(key)) return;

    dispatcher.enqueue(event.aggregateId, async () => {
      const result = await options.store.append(toStoredEvent(event));
      if (result === "duplicate") {
        logger.debug("Domain event already persisted", {
          module: "events.persistence",
          eventName: event.eventName,
          correlationId: event.correlationId,
        });
      }
    });
  });
}
