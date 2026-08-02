/**
 * Supabase event-cluster adapter — Sprint 1.9.
 *
 * Binds the event store, the two projections, the analytics sink, and the
 * realtime publisher. Conditional and idempotent, exactly like the room and
 * identity adapters: with no persistence endpoint configured nothing is bound
 * and the shell still boots.
 *
 * The composition root calls the neutral seam in `@/infrastructure/events`.
 */
import {
  ACTIVITY_TIMELINE_PROJECTION,
  ANALYTICS_EVENT_SINK,
  EVENT_STORE_REPOSITORY,
  REALTIME_EVENT_PUBLISHER,
  RECENT_PARTNERS_PROJECTION,
} from "@/repository/events";
import { bindRepository, isRepositoryBound } from "@/repository/repository-registry";

import { getBrowserDataConnection, type DataConnection } from "../connection";
import { createSupabaseActivityTimelineProjection } from "./supabase-activity-timeline-projection";
import { createSupabaseAnalyticsEventSink } from "./supabase-analytics-event-sink";
import { createSupabaseEventStoreRepository } from "./supabase-event-store-repository";
import { createSupabaseRealtimeEventPublisher } from "./supabase-realtime-event-publisher";
import { createSupabaseRecentPartnersProjection } from "./supabase-recent-partners-projection";

export function registerSupabaseEventAdapter(connection?: DataConnection): boolean {
  const active = connection ?? getBrowserDataConnection();
  if (!active.isAvailable()) return false;

  if (!isRepositoryBound(EVENT_STORE_REPOSITORY)) {
    bindRepository(EVENT_STORE_REPOSITORY, () => createSupabaseEventStoreRepository(active));
  }
  if (!isRepositoryBound(ACTIVITY_TIMELINE_PROJECTION)) {
    bindRepository(ACTIVITY_TIMELINE_PROJECTION, () =>
      createSupabaseActivityTimelineProjection(active),
    );
  }
  if (!isRepositoryBound(RECENT_PARTNERS_PROJECTION)) {
    bindRepository(RECENT_PARTNERS_PROJECTION, () =>
      createSupabaseRecentPartnersProjection(active),
    );
  }
  if (!isRepositoryBound(ANALYTICS_EVENT_SINK)) {
    bindRepository(ANALYTICS_EVENT_SINK, () => createSupabaseAnalyticsEventSink(active));
  }
  if (!isRepositoryBound(REALTIME_EVENT_PUBLISHER)) {
    bindRepository(REALTIME_EVENT_PUBLISHER, () => createSupabaseRealtimeEventPublisher(active));
  }
  return true;
}

export {
  DOMAIN_EVENT_COLUMNS,
  toActivityTimelineInsert,
  toAnalyticsEventInsert,
  toDomainEventInsert,
  toRecentPartnerInsert,
} from "./event-mapper";
export { createSupabaseActivityTimelineProjection } from "./supabase-activity-timeline-projection";
export { createSupabaseAnalyticsEventSink } from "./supabase-analytics-event-sink";
export { createSupabaseEventStoreRepository } from "./supabase-event-store-repository";
export { createSupabaseRealtimeEventPublisher } from "./supabase-realtime-event-publisher";
export { createSupabaseRecentPartnersProjection } from "./supabase-recent-partners-projection";
