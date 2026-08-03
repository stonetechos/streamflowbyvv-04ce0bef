/**
 * Event-cluster row mappers — Sprint 1.9 (Sprint 1.3 §2).
 *
 * The only module aware of the physical shape of `domain_events`,
 * `analytics_events`, `activity_timeline`, and `recent_partners`. Neutral
 * records enter, rows leave; nothing above Infrastructure sees a column name.
 */
import type {
  ActivityTimelineEntry,
  AnalyticsEventRecord,
  PartnerObservation,
  StoredDomainEvent,
} from "@/repository";

import type { Json, TableInsert, TableRow } from "../supabase.types";

export type DomainEventRow = TableRow<"domain_events">;
export type DomainEventInsert = TableInsert<"domain_events">;
export type AnalyticsEventInsert = TableInsert<"analytics_events">;
export type ActivityTimelineInsert = TableInsert<"activity_timeline">;
export type RecentPartnerRow = TableRow<"recent_partners">;
export type RecentPartnerInsert = TableInsert<"recent_partners">;

export const DOMAIN_EVENT_COLUMNS =
  "id, event_name, event_version, aggregate_type, aggregate_id, sequence, occurred_at, correlation_id, causation_id, actor_profile_id, payload";

export const RECENT_PARTNER_COLUMNS =
  "id, profile_id, partner_profile_id, session_count, last_watched_at";

export function toDomainEventInsert(event: StoredDomainEvent): DomainEventInsert {
  return {
    event_name: event.eventName,
    event_version: event.eventVersion,
    aggregate_type: event.aggregateType,
    aggregate_id: event.aggregateId,
    sequence: event.sequence,
    occurred_at: event.occurredAt,
    correlation_id: event.correlationId,
    causation_id: event.causationId,
    actor_profile_id: event.actorProfileId,
    payload: event.payload as unknown as Json,
  };
}

export function toAnalyticsEventInsert(record: AnalyticsEventRecord): AnalyticsEventInsert {
  return {
    event_name: record.eventName,
    profile_id: record.profileId,
    room_id: record.roomId,
    properties: record.properties as unknown as Json,
    occurred_at: record.occurredAt,
    locale: record.locale,
    platform: record.platform,
    app_version: record.appVersion,
  };
}

export function toActivityTimelineInsert(entry: ActivityTimelineEntry): ActivityTimelineInsert {
  return {
    profile_id: entry.profileId,
    activity_type: entry.activityType,
    related_room_id: entry.relatedRoomId,
    summary_key: entry.summaryKey,
    payload: entry.payload as unknown as Json,
    occurred_at: entry.occurredAt,
  };
}

export function toRecentPartnerInsert(observation: PartnerObservation): RecentPartnerInsert {
  return {
    profile_id: observation.profileId,
    partner_profile_id: observation.partnerProfileId,
    session_count: 1,
    last_watched_at: observation.watchedAt,
  };
}
