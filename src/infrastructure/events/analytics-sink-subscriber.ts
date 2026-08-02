/**
 * Analytics sink subscriber — Sprint 1.9.
 *
 * Two inbound paths, one outbound writer:
 *
 * 1. Domain events whose catalog consumer column names analytics.
 * 2. Records emitted by `AnalyticsService` (consent is enforced there, never
 *    here — Foundation §14.2).
 *
 * Payloads are reduced to scalar facts: no free text, no nested objects, no
 * identifiers beyond those the catalog already publishes.
 */
import type { CatalogEvent, DomainEventName, EventBus, Unsubscribe } from "@/domain/events";
import type { AnalyticsRecord, AnalyticsService } from "@/domain/services";
import type { AnalyticsEventRecord, AnalyticsEventSinkRepository } from "@/repository";

import { createOrderedDispatcher, createReplayGuard, eventKey, type OrderedDispatcher } from "./event-dispatch";
import { payloadString } from "./event-serializer";

/** Catalog §2–§9: events whose documented consumer includes analytics. */
const ANALYTICS_EVENTS: ReadonlySet<DomainEventName> = new Set<DomainEventName>([
  "SignedUp",
  "RoomCreated",
  "RoomStatusChanged",
  "RoomEnded",
  "MemberJoined",
  "MemberLeft",
  "InviteCreated",
  "InviteAccepted",
  "PlaybackSessionStarted",
  "PlaybackStarted",
  "PlaybackEnded",
  "ResyncApplied",
  "VoiceSessionStarted",
  "VoiceSessionEnded",
  "ComplianceActionBlocked",
  "FeatureFlagAssigned",
]);

/** Keeps only scalar payload members; analytics never stores structures. */
function scalarProperties(
  payload: Readonly<Record<string, unknown>>,
): Record<string, string | number | boolean> {
  const properties: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      properties[key] = value;
    }
  }
  return properties;
}

/** Maps an envelope to the analytics row shape. Pure. */
export function toAnalyticsEvent(event: CatalogEvent): AnalyticsEventRecord {
  const roomId = payloadString(event, "roomId") ?? (event.aggregateType === "room" ? event.aggregateId : null);
  return {
    eventName: event.eventName,
    profileId: event.actorProfileId,
    roomId,
    properties: {
      ...scalarProperties(event.payload as Record<string, unknown>),
      correlationId: event.correlationId,
    },
    occurredAt: event.occurredAt,
    locale: null,
    platform: null,
    appVersion: null,
  };
}

export interface AnalyticsSinkSubscriberOptions {
  readonly bus: EventBus;
  readonly sink: AnalyticsEventSinkRepository;
  /** Optional: also persists explicitly tracked records. */
  readonly analytics?: AnalyticsService;
  readonly dispatcher?: OrderedDispatcher;
}

export function createAnalyticsSinkSubscriber(
  options: AnalyticsSinkSubscriberOptions,
): Unsubscribe {
  const dispatcher = options.dispatcher ?? createOrderedDispatcher("events.analytics");
  const guard = createReplayGuard();

  const unsubscribeBus = options.bus.subscribeAll((event: CatalogEvent) => {
    if (!ANALYTICS_EVENTS.has(event.eventName)) return;
    if (!guard.admit(`analytics:${eventKey(event)}`)) return;
    const record = toAnalyticsEvent(event);
    dispatcher.enqueue(event.aggregateId, () => options.sink.record(record));
  });

  const unregisterSink = options.analytics?.registerSink((record: AnalyticsRecord) => {
    dispatcher.enqueue(`analytics:${record.name}`, () =>
      options.sink.record({
        eventName: record.name,
        profileId: null,
        roomId: null,
        properties: record.correlationId
          ? { ...record.properties, correlationId: record.correlationId }
          : { ...record.properties },
        occurredAt: record.occurredAt,
        locale: null,
        platform: null,
        appVersion: null,
      }),
    );
  });

  return () => {
    unsubscribeBus();
    unregisterSink?.();
  };
}
