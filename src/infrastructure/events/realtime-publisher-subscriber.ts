/**
 * Realtime publisher subscriber — Sprint 1.9.
 *
 * Publishes domain events — and only domain events — outward after they have
 * been accepted by the store. Publication is best-effort and never blocks or
 * fails the originating business operation. Nothing subscribes in this sprint:
 * no UI listener, no client channel, no websocket component (sprint scope).
 */
import type { CatalogEvent, EventBus, Unsubscribe } from "@/domain/events";
import type { RealtimeEventPublisher } from "@/repository";

import { createOrderedDispatcher, createReplayGuard, eventKey, type OrderedDispatcher } from "./event-dispatch";
import { toStoredEvent } from "./event-serializer";

export interface RealtimePublisherSubscriberOptions {
  readonly bus: EventBus;
  readonly publisher: RealtimeEventPublisher;
  readonly dispatcher?: OrderedDispatcher;
}

export function createRealtimePublisherSubscriber(
  options: RealtimePublisherSubscriberOptions,
): Unsubscribe {
  const dispatcher = options.dispatcher ?? createOrderedDispatcher("events.realtime");
  const guard = createReplayGuard();

  return options.bus.subscribeAll((event: CatalogEvent) => {
    if (!guard.admit(`realtime:${eventKey(event)}`)) return;
    const record = toStoredEvent(event);
    // Same aggregate key as persistence, so peers observe catalog order.
    dispatcher.enqueue(event.aggregateId, () => options.publisher.publish(record));
  });
}
