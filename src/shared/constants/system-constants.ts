/**
 * System constants — the single runtime source for every value fixed in
 * Foundation Specification v1.0 §14.
 *
 * Build Rules §10: no duration, threshold, expiry, or retention value may be
 * invented, hard-coded twice, or quietly changed. Any consumer imports from
 * here; nothing re-declares these numbers.
 *
 * Values are transcribed from the frozen specification and may only change via
 * a numbered ADR.
 */

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Foundation §14.1 — Countdown. */
export const COUNTDOWN = Object.freeze({
  DEFAULT_SECONDS: 5,
  MIN_SECONDS: 3,
  MAX_SECONDS: 60,
});

/** Foundation §14.2 — Invitations. */
export const INVITATION = Object.freeze({
  INVITE_EXPIRY_MS: 24 * HOUR_MS,
  JOIN_LINK_EXPIRY_MS: 24 * HOUR_MS,
});

/** Foundation §14.3 — Rooms. ADR-013: domain cap 4 over a 2–8 schema envelope. */
export const ROOM = Object.freeze({
  INACTIVITY_TIMEOUT_MS: 30 * MINUTE_MS,
  RECENT_RETENTION_MS: 30 * DAY_MS,
  MAX_MEMBERS: 4,
  SCHEMA_MIN_MEMBERS: 2,
  SCHEMA_MAX_MEMBERS: 8,
});

/** Foundation §14.4 — Retention. ADR-012 invariant: projections < domain events. */
export const RETENTION = Object.freeze({
  DOMAIN_EVENTS_MS: 730 * DAY_MS, // 24 months
  PROJECTIONS_MS: 90 * DAY_MS,
  PO_SESSIONS_MS: 30 * DAY_MS,
  ANALYTICS_MS: 365 * DAY_MS, // 12 months
});

/** Foundation §14.5 — Synchronization quality bands. */
export const SYNC_QUALITY_BANDS = Object.freeze({
  EXCELLENT_MAX_MS: 100,
  GOOD_MAX_MS: 250,
  WARNING_MAX_MS: 500,
});

export const SYNC_QUALITY = ["excellent", "good", "warning", "resync_required"] as const;
export type SyncQualityBand = (typeof SYNC_QUALITY)[number];

/** Foundation §19 — Rate-limit policy. Enforced in the Domain layer when built. */
export const RATE_LIMITS = Object.freeze({
  ROOM_CREATION_PER_HOUR: 10,
  INVITE_CREATION_PER_HOUR: 30,
  INVITE_CREATION_PER_ROOM: 10,
  JOIN_ATTEMPTS_PER_HOUR: 20,
  RESYNC_REQUESTS_PER_ROOM_PER_HOUR: 12,
  PO_TURNS_PER_HOUR: 60,
  NOTIFICATION_EMAILS_PER_DAY: 20,
});

/** Foundation §18 — Local-first cache TTLs. */
export const CACHE_TTL = Object.freeze({
  ROOM_SHELL_MS: 30 * DAY_MS,
  PROVIDER_CATALOG_MS: 24 * HOUR_MS,
  FEATURE_FLAGS_MS: 1 * HOUR_MS,
});

export const TIME = Object.freeze({ SECOND_MS, MINUTE_MS, HOUR_MS, DAY_MS });
