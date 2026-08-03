/**
 * Playback synchronization models — Sprint 2.7 (pure, immutable).
 *
 * The vocabulary for *how* a room's playback state is synchronized. Sprint 2.4
 * decided what playback should do; this module describes how far apart the
 * participants are while doing it, and nothing more.
 *
 * Scope discipline, unchanged since Sprint 2.4 and reaffirmed here: no media
 * operation, no provider API, no player handle, no browser action. A
 * `PlaybackCorrection` is a *classification* — a statement that a correction
 * would be eligible — never an instruction that one was or will be performed.
 * StreamFlow coordinates people; each participant presses play in their own
 * app (MVP §6, ADR-003).
 *
 * The five shapes:
 *
 *  - `PlaybackAnchor`   — the agreed (media position, server instant) pair the
 *                         whole room derives from.
 *  - `PlaybackPosition` — where the anchor says playback sits at one instant.
 *  - `PlaybackDelta`    — how far one participant is from that position.
 *  - `PlaybackCorrection` — what class of correction that delta would justify.
 *  - `PlaybackHealth`   — the room's playback synchronization band.
 *
 * All values are milliseconds of media time unless the name says otherwise,
 * and every instant is ISO-8601 UTC, matching the room aggregate.
 */
import type { SyncHealth } from "@/domain/sync/sync.types";

import { normalizePosition, type IsoInstant } from "./playback.types";

/**
 * Playback health reuses the clock-sync bands verbatim.
 *
 * Foundation §14.5 defines one set of quality bands for the product; inventing
 * a second, playback-only scale would mean two different meanings for the word
 * "Good" on the same screen.
 */
export type PlaybackHealth = SyncHealth;

/**
 * The room's agreed reference point.
 *
 * `positionMs` is media time; `serverInstantMs` is the *server-corrected*
 * instant that position was true at — never a raw device clock. Every derived
 * position in the application comes from an anchor, which is what keeps the
 * whole room reading one number.
 */
export interface PlaybackAnchor {
  readonly roomId: string;
  readonly positionMs: number;
  /** Server-corrected epoch milliseconds, from `ClockSyncService`. */
  readonly serverInstantMs: number;
  readonly anchorAt: IsoInstant | null;
  /** False while paused: the anchor still holds, it just does not advance. */
  readonly isAdvancing: boolean;
  readonly durationMs: number | null;
  /** Runtime revision the anchor was read from; lets peers drop stale reads. */
  readonly revision: number;
}

export function createPlaybackAnchor(input: {
  readonly roomId: string;
  readonly positionMs: number;
  readonly serverInstantMs: number;
  readonly anchorAt: IsoInstant | null;
  readonly isAdvancing: boolean;
  readonly durationMs?: number | null;
  readonly revision?: number;
}): PlaybackAnchor {
  return Object.freeze({
    roomId: input.roomId,
    positionMs: normalizePosition(input.positionMs),
    serverInstantMs: Math.round(input.serverInstantMs),
    anchorAt: input.anchorAt,
    isAdvancing: input.isAdvancing,
    durationMs:
      input.durationMs === undefined || input.durationMs === null
        ? null
        : normalizePosition(input.durationMs),
    revision: input.revision ?? 0,
  });
}

/** Where the anchor says playback sits at one server-corrected instant. */
export interface PlaybackPosition {
  readonly roomId: string;
  readonly positionMs: number;
  readonly serverInstantMs: number;
  readonly isAdvancing: boolean;
  /** True when the anchor is older than the policy's freshness window. */
  readonly isStale: boolean;
}

/**
 * One participant's distance from the authoritative position.
 *
 * Positive `deltaMs` means the participant is *ahead* of the room. The sign is
 * kept because it is the only part a human can act on ("you are 700ms ahead");
 * every band decision uses the magnitude.
 */
export interface PlaybackDelta {
  readonly profileId: string;
  readonly deltaMs: number;
  readonly magnitudeMs: number;
  readonly health: PlaybackHealth;
  /** False when the participant has reported no position to compare. */
  readonly isMeasured: boolean;
  readonly observedAt: IsoInstant;
}

/** What class of correction a delta would justify. Classification only. */
export const PLAYBACK_CORRECTION_KINDS = ["none", "soft", "hard"] as const;
export type PlaybackCorrectionKind = (typeof PLAYBACK_CORRECTION_KINDS)[number];

/**
 * A correction the policy considers *eligible*.
 *
 * `applied` is permanently false in this sprint and is present so that a later
 * engine cannot quietly change the meaning of the model: anything that ever
 * performs a correction must set it explicitly, in a sprint that is allowed to.
 */
export interface PlaybackCorrection {
  readonly kind: PlaybackCorrectionKind;
  /** Media position the participant would move to, were a correction made. */
  readonly targetPositionMs: number;
  /** Signed distance the correction would cover. */
  readonly deltaMs: number;
  readonly health: PlaybackHealth;
  /** Always false — Sprint 2.7 classifies and never corrects. */
  readonly applied: false;
  readonly reason: PlaybackCorrectionReason;
}

/** Why a correction class was chosen. Machine-readable; UI maps to copy. */
export type PlaybackCorrectionReason =
  | "within_tolerance"
  | "soft_eligible"
  | "hard_eligible"
  | "not_measured";

/**
 * The synchronization decision for a room. This is the entire decision space
 * of the engine; there is no sixth answer, and none of the five performs an
 * action.
 */
export const PLAYBACK_SYNC_DECISIONS = [
  "stay_synchronized",
  "recommend_resync",
  "require_resync",
  "waiting",
  "recovering",
] as const;
export type PlaybackSyncDecision = (typeof PLAYBACK_SYNC_DECISIONS)[number];

/** Everything the room knows about playback synchronization at one instant. */
export interface PlaybackSyncSnapshot {
  readonly roomId: string;
  readonly decision: PlaybackSyncDecision;
  readonly health: PlaybackHealth;
  readonly anchor: PlaybackAnchor | null;
  readonly position: PlaybackPosition | null;
  readonly deltas: readonly PlaybackDelta[];
  /** The correction class the worst measured participant would justify. */
  readonly correction: PlaybackCorrection;
  /** Participants inside Excellent or Good. */
  readonly inSyncCount: number;
  /** Measured participants outside those bands. */
  readonly outOfSyncCount: number;
  /** Participants with no comparable position yet. */
  readonly unmeasuredCount: number;
  readonly participantCount: number;
  /** The room is armed and synchronization is satisfactory. */
  readonly isPlaybackReady: boolean;
  /** Clock synchronization is satisfactory, whatever playback is doing. */
  readonly isSynchronizationReady: boolean;
  /** Armed, eligible, and nobody has pressed play — the MVP's normal state. */
  readonly isWaitingForManualPlay: boolean;
  readonly isWaitingForResync: boolean;
  readonly observedAt: IsoInstant;
}

/** One participant's self-reported playback position. Input to the engine. */
export interface ParticipantPlaybackReport {
  readonly profileId: string;
  /** Null when the participant has not reported a position. */
  readonly positionMs: number | null;
  readonly isOnline: boolean;
  readonly observedAt: IsoInstant;
}
