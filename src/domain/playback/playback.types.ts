/**
 * Playback runtime models — Sprint 2.4 (pure, immutable).
 *
 * These four shapes are the whole vocabulary of playback orchestration:
 *
 *  - `PlaybackSession` — the durable fact that a room has something to watch.
 *  - `PlaybackTimeline` — where the room believes playback sits, and whether
 *    that position is advancing. Derived positions are computed, never stored.
 *  - `PlaybackSnapshot` — state plus timeline plus ownership, as a screen or a
 *    peer reads it at one instant.
 *  - `PlaybackIntent` — a request the host issued ("pause at 00:12:04").
 *
 * Nothing in this module performs a media operation. StreamFlow never controls
 * a provider's player: an intent is a shared decision, and each participant
 * carries it out in their own app (MVP §6, ADR-003).
 */
import type { SessionEndReason, SyncMode } from "@/domain/shared/domain-enums";

import type { PlaybackMachineState } from "./playback-machine";

export type IsoInstant = string;

/** What kind of decision the host made. One per coordinator entry point. */
export const PLAYBACK_INTENT_KINDS = ["play", "pause", "resume", "seek", "stop"] as const;
export type PlaybackIntentKind = (typeof PLAYBACK_INTENT_KINDS)[number];

/** An immutable record of a host decision. Carries no provider handle. */
export interface PlaybackIntent {
  readonly kind: PlaybackIntentKind;
  readonly roomId: string;
  /** Who issued it. Only the playback owner may (see the coordinator). */
  readonly actorProfileId: string;
  /** Position the intent refers to, in milliseconds of media time. */
  readonly positionMs: number;
  /** Target position for a seek; null for every other kind. */
  readonly toPositionMs: number | null;
  readonly issuedAt: IsoInstant;
  readonly correlationId: string;
}

export function createPlaybackIntent(input: {
  readonly kind: PlaybackIntentKind;
  readonly roomId: string;
  readonly actorProfileId: string;
  readonly positionMs?: number;
  readonly toPositionMs?: number | null;
  readonly issuedAt: IsoInstant;
  readonly correlationId: string;
}): PlaybackIntent {
  return Object.freeze({
    kind: input.kind,
    roomId: input.roomId,
    actorProfileId: input.actorProfileId,
    positionMs: normalizePosition(input.positionMs ?? 0),
    toPositionMs:
      input.toPositionMs === undefined || input.toPositionMs === null
        ? null
        : normalizePosition(input.toPositionMs),
    issuedAt: input.issuedAt,
    correlationId: input.correlationId,
  });
}

/** The durable session fact — Database Spec §3.5 `playback_sessions`. */
export interface PlaybackSession {
  readonly id: string;
  readonly roomId: string;
  readonly providerId: string | null;
  readonly syncMode: SyncMode;
  /** The profile authoritative for playback decisions; normally the host. */
  readonly ownerProfileId: string | null;
  readonly startedAt: IsoInstant | null;
  readonly endedAt: IsoInstant | null;
  readonly endReason: SessionEndReason | null;
}

/**
 * Where the room believes playback sits. `anchorAt` is the instant the
 * position was agreed; a client derives "now" from it rather than from its own
 * running counter, which is what keeps every screen reading the same number.
 */
export interface PlaybackTimeline {
  readonly positionMs: number;
  readonly anchorAt: IsoInstant | null;
  readonly isAdvancing: boolean;
  /** Total media length when known. Manual-sync rooms usually do not know it. */
  readonly durationMs: number | null;
}

export const IDLE_TIMELINE: PlaybackTimeline = Object.freeze({
  positionMs: 0,
  anchorAt: null,
  isAdvancing: false,
  durationMs: null,
});

export function createTimeline(input: {
  readonly positionMs: number;
  readonly anchorAt: IsoInstant | null;
  readonly isAdvancing: boolean;
  readonly durationMs?: number | null;
}): PlaybackTimeline {
  return Object.freeze({
    positionMs: normalizePosition(input.positionMs),
    anchorAt: input.anchorAt,
    isAdvancing: input.isAdvancing,
    durationMs:
      input.durationMs === undefined || input.durationMs === null
        ? null
        : normalizePosition(input.durationMs),
  });
}

/**
 * Pure derivation: the position the timeline implies at `now`. A paused or
 * un-anchored timeline simply reports its stored position.
 */
export function positionAt(timeline: PlaybackTimeline, now: Date): number {
  if (!timeline.isAdvancing || timeline.anchorAt === null) return timeline.positionMs;
  const anchorMs = Date.parse(timeline.anchorAt);
  if (!Number.isFinite(anchorMs)) return timeline.positionMs;
  const elapsed = Math.max(0, now.getTime() - anchorMs);
  const raw = timeline.positionMs + elapsed;
  return timeline.durationMs === null ? raw : Math.min(raw, timeline.durationMs);
}

/** What a screen renders. Built by the coordinator; never persisted as-is. */
export interface PlaybackSnapshot {
  readonly roomId: string;
  readonly state: PlaybackMachineState;
  readonly session: PlaybackSession | null;
  readonly timeline: PlaybackTimeline;
  /** Derived media position at the instant the snapshot was taken. */
  readonly positionMs: number;
  readonly ownerProfileId: string | null;
  readonly isReady: boolean;
  readonly isAdvancing: boolean;
  /** Error taxonomy code when the state is `error`; null otherwise. */
  readonly errorCode: string | null;
  readonly observedAt: IsoInstant;
}

/** Clamps to a whole, non-negative millisecond count. */
export function normalizePosition(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}
