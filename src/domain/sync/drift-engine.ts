/**
 * Drift engine — Sprint 2.5, Foundation §14.5 and §15.
 *
 * Classification only. This module says how far apart things are and what
 * band that falls in; it never corrects anything, never touches a player, and
 * never adjusts a countdown. Automatic correction is deliberately out of
 * scope — a wrong automatic nudge is worse than an honest warning.
 *
 * The four bands and their thresholds are Foundation §14.5, read through the
 * shared constants module so no number is restated here (Build Rules §10).
 */
import {
  SYNC_QUALITY_BANDS,
  type SyncQualityBand,
} from "@/shared/constants/system-constants";

import type { ClockOffset, SyncHealth } from "./sync.types";

/** Worst-first, so aggregation can pick a room's weakest link by index. */
const SEVERITY: readonly SyncHealth[] = Object.freeze([
  "resync_required",
  "warning",
  "good",
  "excellent",
  "unknown",
]);

/**
 * The single place Foundation §14.5 is applied to a deviation.
 *
 * Sign is irrelevant: being 300ms ahead is exactly as far out of step as being
 * 300ms behind.
 */
export function classifyDrift(deviationMs: number): SyncQualityBand {
  const magnitude = Math.abs(deviationMs);
  if (magnitude <= SYNC_QUALITY_BANDS.EXCELLENT_MAX_MS) return "excellent";
  if (magnitude <= SYNC_QUALITY_BANDS.GOOD_MAX_MS) return "good";
  if (magnitude <= SYNC_QUALITY_BANDS.WARNING_MAX_MS) return "warning";
  return "resync_required";
}

/**
 * Drift between what a client believes the shared instant to be and what the
 * server says it is. Positive means the client is running ahead.
 */
export function measureDrift(clientInstantMs: number, serverInstantMs: number): number {
  return Math.round(clientInstantMs - serverInstantMs);
}

/**
 * Health for one client's own clock.
 *
 * The deviation classified is the measured offset itself: a client whose clock
 * sits 400ms from the server's cannot be counted down with better than 400ms of
 * error, whatever the network does afterwards. An estimate the engine has no
 * confidence in reports `unknown` rather than flattering the user with a band
 * built on one lucky sample.
 */
export function healthFromOffset(offset: ClockOffset | null, minConfidence = 0.2): SyncHealth {
  if (!offset || offset.acceptedCount === 0) return "unknown";
  if (offset.confidence < minConfidence) return "unknown";
  return classifyDrift(offset.offsetMs);
}

/** The room is only as synchronized as its weakest member. */
export function aggregateHealth(healths: readonly SyncHealth[]): SyncHealth {
  if (healths.length === 0) return "unknown";
  const known = healths.filter((health) => health !== "unknown");
  if (known.length === 0) return "unknown";
  for (const band of SEVERITY) {
    if (known.includes(band)) return band;
  }
  return "unknown";
}

/** True for the two bands Foundation §15 allows a countdown to be scheduled in. */
export function isHealthSatisfactory(health: SyncHealth): boolean {
  return health === "excellent" || health === "good";
}

/** Foundation §15: the Re-sync Required band blocks scheduling until re-measured. */
export function requiresResync(health: SyncHealth): boolean {
  return health === "resync_required";
}

/**
 * Whether a health change is worth speaking aloud.
 *
 * Accessibility rule for this sprint: announce category crossings, never the
 * latency chatter underneath them. A snapshot refreshing every few seconds
 * within the same band produces exactly zero announcements.
 */
export function crossesHealthCategory(previous: SyncHealth, next: SyncHealth): boolean {
  return previous !== next && next !== "unknown";
}
