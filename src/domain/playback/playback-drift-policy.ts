/**
 * Playback drift policy — Sprint 2.7, Foundation §14.5 and §15.
 *
 * The one place playback drift is turned into a band and a correction class.
 * It is pure, it is classification only, and it performs nothing: eligibility
 * for a soft or hard correction is a statement about the size of a gap, not a
 * decision to close it. Automatic correction remains deliberately unbuilt —
 * a wrong automatic nudge is worse than an honest warning.
 *
 * Thresholds are not restated here. `classifyDrift` (Sprint 2.5) is the single
 * reader of Foundation §14.5, so playback drift and clock drift can never
 * drift apart from each other.
 */
import { classifyDrift, isHealthSatisfactory, requiresResync } from "@/domain/sync/drift-engine";
import { PLAYBACK_SYNC_RUNTIME } from "@/shared/constants/system-constants";

import type {
  ParticipantPlaybackReport,
  PlaybackAnchor,
  PlaybackCorrection,
  PlaybackCorrectionKind,
  PlaybackDelta,
  PlaybackHealth,
  PlaybackPosition,
} from "./playback-sync.types";

/** Foundation §14.5 applied to a playback gap. Sign is irrelevant to a band. */
export function classifyPlaybackDrift(deltaMs: number): PlaybackHealth {
  return classifyDrift(deltaMs);
}

/**
 * Soft correction eligibility.
 *
 * A soft correction is the gentle class — the gap is real but small enough
 * that a human closing it would barely notice. That is exactly the Warning
 * band: past Good, short of Re-sync Required.
 */
export function isSoftCorrectionEligible(health: PlaybackHealth): boolean {
  return health === "warning";
}

/**
 * Hard correction eligibility.
 *
 * Only the Re-sync Required band. Anything gentler than a full re-sync would
 * leave the room visibly apart, and the band exists precisely to say so.
 */
export function isHardCorrectionEligible(health: PlaybackHealth): boolean {
  return requiresResync(health);
}

/** Excellent or Good: the room is together and nothing is recommended. */
export function isPlaybackInSync(health: PlaybackHealth): boolean {
  return isHealthSatisfactory(health);
}

/**
 * Derives the authoritative position an anchor implies at a server-corrected
 * instant. Pure: no device clock is read here, the caller supplies the instant
 * it obtained from `ClockSyncService`.
 */
export function positionFromAnchor(
  anchor: PlaybackAnchor,
  serverInstantMs: number,
): PlaybackPosition {
  const elapsed = anchor.isAdvancing ? Math.max(0, serverInstantMs - anchor.serverInstantMs) : 0;
  const raw = anchor.positionMs + elapsed;
  const positionMs = anchor.durationMs === null ? raw : Math.min(raw, anchor.durationMs);

  return Object.freeze({
    roomId: anchor.roomId,
    positionMs: Math.max(0, Math.floor(positionMs)),
    serverInstantMs: Math.round(serverInstantMs),
    isAdvancing: anchor.isAdvancing,
    // A very old anchor is not wrong, but it is no longer evidence: the policy
    // says so rather than letting the UI present a guess as a measurement.
    isStale: serverInstantMs - anchor.serverInstantMs > PLAYBACK_SYNC_RUNTIME.ANCHOR_STALE_MS,
  });
}

/** How far one participant's report sits from the authoritative position. */
export function deltaFor(
  report: ParticipantPlaybackReport,
  authoritativePositionMs: number,
): PlaybackDelta {
  if (report.positionMs === null || !report.isOnline) {
    return Object.freeze({
      profileId: report.profileId,
      deltaMs: 0,
      magnitudeMs: 0,
      health: "unknown" as PlaybackHealth,
      isMeasured: false,
      observedAt: report.observedAt,
    });
  }

  const deltaMs = Math.round(report.positionMs - authoritativePositionMs);
  return Object.freeze({
    profileId: report.profileId,
    deltaMs,
    magnitudeMs: Math.abs(deltaMs),
    health: classifyPlaybackDrift(deltaMs),
    isMeasured: true,
    observedAt: report.observedAt,
  });
}

/** The correction class a delta would justify, were corrections performed. */
export function correctionFor(
  delta: PlaybackDelta | null,
  authoritativePositionMs: number,
): PlaybackCorrection {
  if (!delta || !delta.isMeasured) {
    return Object.freeze({
      kind: "none" as PlaybackCorrectionKind,
      targetPositionMs: Math.max(0, Math.floor(authoritativePositionMs)),
      deltaMs: 0,
      health: "unknown" as PlaybackHealth,
      applied: false as const,
      reason: "not_measured" as const,
    });
  }

  const kind: PlaybackCorrectionKind = isHardCorrectionEligible(delta.health)
    ? "hard"
    : isSoftCorrectionEligible(delta.health)
      ? "soft"
      : "none";

  return Object.freeze({
    kind,
    targetPositionMs: Math.max(0, Math.floor(authoritativePositionMs)),
    deltaMs: delta.deltaMs,
    health: delta.health,
    applied: false as const,
    reason:
      kind === "hard" ? "hard_eligible" : kind === "soft" ? "soft_eligible" : "within_tolerance",
  });
}

/** The worst measured delta in the room; the room is only as close as this. */
export function worstDelta(deltas: readonly PlaybackDelta[]): PlaybackDelta | null {
  return deltas
    .filter((delta) => delta.isMeasured)
    .reduce<PlaybackDelta | null>(
      (worst, delta) => (!worst || delta.magnitudeMs > worst.magnitudeMs ? delta : worst),
      null,
    );
}
