/**
 * Event infrastructure contracts — Sprint 1.9.
 * Re-exported through `@/repository` so no layer reaches into a subfolder.
 */
export {
  EVENT_STORE_REPOSITORY,
  type EventAppendResult,
  type EventPayloadRecord,
  type EventStoreRepository,
  type StoredDomainEvent,
} from "./event-store.types";
export {
  ACTIVITY_TIMELINE_PROJECTION,
  ACTIVITY_TYPES,
  ANALYTICS_EVENT_SINK,
  RECENT_PARTNERS_PROJECTION,
  type ActivityTimelineEntry,
  type ActivityTimelineProjection,
  type ActivityType,
  type AnalyticsEventRecord,
  type AnalyticsEventSinkRepository,
  type PartnerObservation,
  type RecentPartnersProjection,
} from "./projection.types";
export {
  REALTIME_EVENT_PUBLISHER,
  type RealtimeEventPublisher,
} from "./realtime.types";
