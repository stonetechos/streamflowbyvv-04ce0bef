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

/**
 * Countdown runtime cadence — Sprint 2.3 operational tuning.
 *
 * Foundation §14.1 fixes the countdown envelope (3–60s, default 5s) but leaves
 * the runtime cadence to implementation, exactly as §14.3 does for presence.
 * These values are operational, not normative, and are candidates for
 * ratification by a future ADR.
 *
 * - `TICK_INTERVAL_MS` — UI refresh; sub-second so the last second is honest.
 * - `EXPIRY_GRACE_MS` — how long a countdown may sit past its target before it
 *   is retired as abandoned (a closed tab must not strand the room).
 * - `ANNOUNCE_FROM_SECONDS` — the final seconds spoken to assistive tech.
 */
export const COUNTDOWN_RUNTIME = Object.freeze({
  TICK_INTERVAL_MS: 250,
  EXPIRY_GRACE_MS: 30 * SECOND_MS,
  ANNOUNCE_FROM_SECONDS: 5,
});

/**
 * Account constants — Milestone E.
 *
 * `MIN_PASSWORD_LENGTH` is a client-side courtesy check only; the identity
 * provider remains the authority on password policy (Foundation §10.3).
 */
export const ACCOUNT = Object.freeze({
  MIN_PASSWORD_LENGTH: 8,
  MAX_DISPLAY_NAME_LENGTH: 40,
});

/** Convenience alias for the most frequently read account constant. */
export const MIN_PASSWORD_LENGTH = ACCOUNT.MIN_PASSWORD_LENGTH;


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

/**
 * Presence heartbeat — Sprint 2.1 operational tuning.
 *
 * Foundation §14.3 fixes the room inactivity window (30 minutes) but leaves
 * the heartbeat cadence to implementation. These two values are the only
 * place that cadence is expressed; they are operational, not normative, and
 * are candidates for ratification by a future ADR. `STALE_AFTER_MS` is three
 * missed beats — one lost beat must not blink a member offline.
 */
export const PRESENCE = Object.freeze({
  HEARTBEAT_INTERVAL_MS: 20 * SECOND_MS,
  STALE_AFTER_MS: 60 * SECOND_MS,
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

/**
 * Clock-sync runtime cadence — Sprint 2.5 operational tuning.
 *
 * Foundation §14.5 fixes the quality bands and §15 fixes the estimation rules
 * (halved round trip, outlier rejection, median offset), but leaves burst size,
 * window length, and refresh cadence to implementation — exactly as it does for
 * the countdown and presence cadences. These values are operational, not
 * normative, and are candidates for ratification by a future ADR.
 *
 * - `BURST_SIZE` — probes taken per burst (join, reconnect, before scheduling).
 * - `BURST_SPACING_MS` — gap between probes so one congested moment cannot
 *   colour a whole burst.
 * - `WINDOW_SIZE` — retained samples; the rolling average's memory.
 * - `REFRESH_INTERVAL_MS` — the lighter periodic refresh while a room is open.
 * - `PROBE_TIMEOUT_MS` — a probe slower than this is worthless as a sample.
 * - `MIN_SAMPLES_FOR_REJECTION` — below this a "median" is not meaningful.
 * - `OUTLIER_MAD_FACTOR` — deviations above the median before rejection.
 * - `OUTLIER_FLAT_FACTOR` — fallback multiple when the link has zero jitter.
 * - `SPREAD_CEILING_MS` — offset spread at which sample agreement scores zero.
 */
export const SYNC_RUNTIME = Object.freeze({
  BURST_SIZE: 5,
  BURST_SPACING_MS: 120,
  WINDOW_SIZE: 12,
  REFRESH_INTERVAL_MS: 30 * SECOND_MS,
  PROBE_TIMEOUT_MS: 5 * SECOND_MS,
  MIN_SAMPLES_FOR_REJECTION: 3,
  OUTLIER_MAD_FACTOR: 3,
  OUTLIER_FLAT_FACTOR: 2,
  SPREAD_CEILING_MS: 500,
});

/**
 * Playback-synchronization cadence — Sprint 2.7 operational tuning.
 *
 * Foundation §14.5 fixes the quality bands that classify a playback gap; it
 * leaves how often a room re-evaluates, and how long an anchor stays credible,
 * to implementation. These are operational values only — no threshold that
 * decides a band lives here.
 *
 * - `EVALUATION_INTERVAL_MS` — cadence of the room's re-evaluation while armed.
 * - `ANCHOR_STALE_MS` — beyond this an anchor is reported as no longer evidence.
 * - `RECOVERY_WINDOW_MS` — how long a room reads as "recovering" after it
 *   returns from Re-sync Required, so the lobby does not flicker between
 *   verdicts on one good measurement.
 */
export const PLAYBACK_SYNC_RUNTIME = Object.freeze({
  EVALUATION_INTERVAL_MS: 2 * SECOND_MS,
  ANCHOR_STALE_MS: 60 * SECOND_MS,
  RECOVERY_WINDOW_MS: 8 * SECOND_MS,
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

/**
 * Sprint 2.9 — Ready confirmation. Operational values only: no band, no
 * eligibility rule lives here. `TIMEOUT_MS` is how long a joined member may
 * stay unconfirmed before the lobby says so (it never removes anyone), and
 * `REMINDER_LEAD_SECONDS` is how early the manual-play reminder is surfaced.
 */
export const READY_CONFIRMATION = Object.freeze({
  TIMEOUT_MS: 5 * MINUTE_MS,
  REMINDER_LEAD_SECONDS: 10,
});

export const TIME = Object.freeze({ SECOND_MS, MINUTE_MS, HOUR_MS, DAY_MS });
