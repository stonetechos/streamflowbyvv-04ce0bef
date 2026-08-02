/**
 * Event infrastructure seam — Sprint 1.9.
 *
 * Binds the event-cluster adapters and attaches the infrastructure
 * subscribers to the Domain event bus. The bus itself stays ignorant of every
 * one of them (Foundation §4): subscription is inward-pointing, so replacing
 * the store or the transport is a change to this folder alone.
 *
 * No UI, no client listener, no websocket component is created here.
 */
import { ANALYTICS_SERVICE, EVENT_BUS } from "@/domain/services";
import { resolveService } from "@/domain/service-registry";
import { logger } from "@/foundation/logging";
import {
  ACTIVITY_TIMELINE_PROJECTION,
  ANALYTICS_EVENT_SINK,
  EVENT_STORE_REPOSITORY,
  REALTIME_EVENT_PUBLISHER,
  RECENT_PARTNERS_PROJECTION,
  resolveRepository,
} from "@/repository";
import type { Unsubscribe } from "@/domain/events";

import { registerSupabaseEventAdapter } from "../supabase/events";
import { createActivityTimelineSubscriber } from "./activity-timeline-subscriber";
import { createAnalyticsSinkSubscriber } from "./analytics-sink-subscriber";
import { createEventPersistenceSubscriber } from "./domain-event-persistence-subscriber";
import { createRealtimePublisherSubscriber } from "./realtime-publisher-subscriber";
import { createRecentPartnersSubscriber } from "./recent-partners-subscriber";

/** Describes the compiled-in event adapter. Diagnostics only. */
export interface EventAdapterDescriptor {
  readonly id: string;
  readonly persistsDomainEvents: true;
  readonly publishesRealtime: true;
}

export const ACTIVE_EVENT_ADAPTER: EventAdapterDescriptor = Object.freeze({
  id: "postgres-supabase",
  persistsDomainEvents: true,
  publishesRealtime: true,
});

let subscriptions: Unsubscribe[] = [];

/**
 * Binds adapters and wires subscribers. Idempotent, and a no-op when the
 * backend is not configured.
 */
export function registerEventInfrastructure(): boolean {
  if (subscriptions.length > 0) return true;
  if (!registerSupabaseEventAdapter()) return false;

  const bus = resolveService(EVENT_BUS);

  subscriptions = [
    createEventPersistenceSubscriber({
      bus,
      store: resolveRepository(EVENT_STORE_REPOSITORY),
    }),
    createActivityTimelineSubscriber({
      bus,
      projection: resolveRepository(ACTIVITY_TIMELINE_PROJECTION),
    }),
    createRecentPartnersSubscriber({
      bus,
      projection: resolveRepository(RECENT_PARTNERS_PROJECTION),
    }),
    createAnalyticsSinkSubscriber({
      bus,
      sink: resolveRepository(ANALYTICS_EVENT_SINK),
      analytics: resolveService(ANALYTICS_SERVICE),
    }),
    createRealtimePublisherSubscriber({
      bus,
      publisher: resolveRepository(REALTIME_EVENT_PUBLISHER),
    }),
  ];

  logger.info("Event infrastructure attached", {
    module: "events",
    subscribers: subscriptions.length,
  });
  return true;
}

/** Detaches every subscriber. Test-support and teardown only. */
export function resetEventInfrastructure(): void {
  for (const unsubscribe of subscriptions) unsubscribe();
  subscriptions = [];
}

export {
  createOrderedDispatcher,
  createReplayGuard,
  eventKey,
  type OrderedDispatcher,
  type ReplayGuard,
} from "./event-dispatch";
export { toStoredEvent } from "./event-serializer";
export { createActivityTimelineSubscriber, toActivityEntries } from "./activity-timeline-subscriber";
export { createAnalyticsSinkSubscriber, toAnalyticsEvent } from "./analytics-sink-subscriber";
export { createEventPersistenceSubscriber } from "./domain-event-persistence-subscriber";
export { createRealtimePublisherSubscriber } from "./realtime-publisher-subscriber";
export { createRecentPartnersSubscriber, toPartnerObservations } from "./recent-partners-subscriber";
