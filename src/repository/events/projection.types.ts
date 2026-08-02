/**
 * Projection contracts — Sprint 1.9.
 *
 * Read-model writers fed exclusively by domain events (Domain Event Catalog
 * v1.0 §3, §4, §7 consumer columns). Each contract is idempotent by design so
 * a replayed event cannot double-count a projection row.
 */
import { createRepositoryToken, type RepositoryToken } from "@/repository/repository-registry";

import type { EventPayloadRecord } from "./event-store.types";

/** Activity kinds the timeline read model accepts (Database Spec §3.9). */
export const ACTIVITY_TYPES = [
  "room_created",
  "room_joined",
  "room_ended",
  "invite_sent",
  "invite_accepted",
  "voice_joined",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ActivityTimelineEntry {
  readonly profileId: string;
  readonly activityType: ActivityType;
  readonly relatedRoomId: string | null;
  /** Localization key, never a rendered string (Foundation §13). */
  readonly summaryKey: string;
  readonly payload: EventPayloadRecord;
  readonly occurredAt: string;
}

export interface ActivityTimelineProjection {
  /** Idempotent: the same source event may be applied more than once. */
  record(entry: ActivityTimelineEntry): Promise<void>;
}

export interface PartnerObservation {
  readonly profileId: string;
  readonly partnerProfileId: string;
  readonly watchedAt: string;
}

export interface RecentPartnersProjection {
  /** Upserts the pairing and advances its last-watched timestamp. */
  touch(observation: PartnerObservation): Promise<void>;
}

export interface AnalyticsEventRecord {
  readonly eventName: string;
  readonly profileId: string | null;
  readonly roomId: string | null;
  /** Identifiers and facts only — never PII or free text (Foundation §14). */
  readonly properties: Readonly<Record<string, string | number | boolean>>;
  readonly occurredAt: string;
  readonly locale: string | null;
  readonly platform: string | null;
  readonly appVersion: string | null;
}

export interface AnalyticsEventSinkRepository {
  record(event: AnalyticsEventRecord): Promise<void>;
}

export const ACTIVITY_TIMELINE_PROJECTION: RepositoryToken<ActivityTimelineProjection> =
  createRepositoryToken<ActivityTimelineProjection>("ActivityTimelineProjection");

export const RECENT_PARTNERS_PROJECTION: RepositoryToken<RecentPartnersProjection> =
  createRepositoryToken<RecentPartnersProjection>("RecentPartnersProjection");

export const ANALYTICS_EVENT_SINK: RepositoryToken<AnalyticsEventSinkRepository> =
  createRepositoryToken<AnalyticsEventSinkRepository>("AnalyticsEventSink");
