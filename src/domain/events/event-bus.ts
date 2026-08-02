/**
 * Internal domain event bus — Sprint 1.6 §3.
 *
 * Traceability: Foundation §4 (internal event bus) and Domain Event Catalog
 * v1.0 §1. Domain-only: publish/subscribe contracts, a typed dispatcher, a
 * per-aggregate sequencer, and immutable envelopes. Infrastructure adapters
 * (persistence, Realtime fan-out, analytics) subscribe later — the bus knows
 * nothing about them.
 */
import { describeEvent, isKnownEvent, type DomainEventName, type DomainEventPayloads } from "./event-catalog";
import {
  systemClock,
  type Clock,
  type DomainEvent,
  type EventHandler,
  type EventMetadata,
  type EventName,
  type Unsubscribe,
} from "./event.types";

export type CatalogEvent<TName extends DomainEventName = DomainEventName> = DomainEvent<
  TName,
  DomainEventPayloads[TName]
>;

export interface EventPublisher {
  publish<TName extends DomainEventName>(
    eventName: TName,
    aggregateId: string,
    payload: DomainEventPayloads[TName],
    metadata: EventMetadata,
  ): Promise<CatalogEvent<TName>>;
}

export interface EventSubscriber {
  subscribe<TName extends DomainEventName>(
    eventName: TName,
    handler: EventHandler<CatalogEvent<TName>>,
  ): Unsubscribe;
  /** Firehose subscription, used by audit and projection adapters. */
  subscribeAll(handler: EventHandler<CatalogEvent>): Unsubscribe;
}

export interface EventBus extends EventPublisher, EventSubscriber {
  /** Next sequence the bus would assign to an aggregate. Test support. */
  peekSequence(aggregateId: string): number;
  reset(): void;
}

export interface EventBusOptions {
  readonly clock?: Clock;
  /** A failing subscriber must never break the publisher. */
  readonly onHandlerError?: (error: unknown, event: CatalogEvent) => void;
  /** Supplies the starting sequence when an aggregate is rehydrated. */
  readonly sequenceSeed?: (aggregateId: string) => number;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value as Readonly<T>;
}

export function createEventBus(options: EventBusOptions = {}): EventBus {
  const clock = options.clock ?? systemClock;
  const handlers = new Map<EventName | "*", Set<EventHandler>>();
  const sequences = new Map<string, number>();

  const nextSequence = (aggregateId: string): number => {
    const current =
      sequences.get(aggregateId) ?? options.sequenceSeed?.(aggregateId) ?? 0;
    const next = current + 1;
    sequences.set(aggregateId, next);
    return next;
  };

  const listen = (key: EventName | "*", handler: EventHandler): Unsubscribe => {
    const set = handlers.get(key) ?? new Set<EventHandler>();
    set.add(handler);
    handlers.set(key, set);
    return () => {
      set.delete(handler);
    };
  };

  const dispatch = async (event: CatalogEvent): Promise<void> => {
    const targets = [
      ...(handlers.get(event.eventName) ?? []),
      ...(handlers.get("*") ?? []),
    ];
    for (const handler of targets) {
      try {
        await handler(event);
      } catch (error) {
        options.onHandlerError?.(error, event);
      }
    }
  };

  return {
    async publish(eventName, aggregateId, payload, metadata) {
      if (!isKnownEvent(eventName)) {
        // Catalog §1: an undocumented event has no envelope and cannot ship.
        throw new Error(`Unknown domain event: ${String(eventName)}`);
      }
      const descriptor = describeEvent(eventName);
      const event = deepFreeze({
        eventName,
        eventVersion: descriptor.version,
        aggregateType: descriptor.aggregateType,
        aggregateId,
        sequence: nextSequence(aggregateId),
        occurredAt: metadata.occurredAt ?? clock.now().toISOString(),
        correlationId: metadata.correlationId,
        causationId: metadata.causationId,
        actorProfileId: metadata.actorProfileId ?? null,
        payload: deepFreeze({ ...payload }),
      }) as CatalogEvent<typeof eventName>;

      await dispatch(event as CatalogEvent);
      return event;
    },

    subscribe: (eventName, handler) => listen(eventName, handler as EventHandler),
    subscribeAll: (handler) => listen("*", handler as EventHandler),

    peekSequence: (aggregateId) => (sequences.get(aggregateId) ?? 0) + 1,

    reset() {
      handlers.clear();
      sequences.clear();
    },
  };
}
