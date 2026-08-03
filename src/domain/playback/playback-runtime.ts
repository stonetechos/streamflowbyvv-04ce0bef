/**
 * Playback runtime projection — Sprint 2.4 (pure).
 *
 * The durable half of playback orchestration, carried in the room's opaque
 * `metadata` bag exactly as the countdown runtime is (Sprint 2.3). Every
 * client reads the same server-written values and derives the same position,
 * so there is no client-authoritative playback clock anywhere.
 *
 * Pure functions over (runtime, now). No timers, no I/O, no vendor types, and
 * no media operation of any kind.
 */
import type { SessionEndReason, SyncMode } from "@/domain/shared/domain-enums";

import { isPlaybackMachineState, type PlaybackMachineState } from "./playback-machine";
import {
  createTimeline,
  normalizePosition,
  positionAt,
  type IsoInstant,
  type PlaybackSession,
  type PlaybackSnapshot,
  type PlaybackTimeline,
} from "./playback.types";

/** Metadata keys owned by the playback runtime. */
export const PLAYBACK_STATE_METADATA_KEY = "playback_state";
export const PLAYBACK_SESSION_ID_METADATA_KEY = "playback_session_id";
export const PLAYBACK_OWNER_METADATA_KEY = "playback_owner_profile_id";
export const PLAYBACK_POSITION_METADATA_KEY = "playback_position_ms";
export const PLAYBACK_ANCHOR_METADATA_KEY = "playback_anchor_at";
export const PLAYBACK_DURATION_METADATA_KEY = "playback_duration_ms";
export const PLAYBACK_SYNC_MODE_METADATA_KEY = "playback_sync_mode";
export const PLAYBACK_STARTED_AT_METADATA_KEY = "playback_started_at";
export const PLAYBACK_ENDED_AT_METADATA_KEY = "playback_ended_at";
export const PLAYBACK_END_REASON_METADATA_KEY = "playback_end_reason";
export const PLAYBACK_ERROR_METADATA_KEY = "playback_error_code";
/** Bumped on every lifecycle write so peers can discard an out-of-order read. */
export const PLAYBACK_REVISION_METADATA_KEY = "playback_revision";

export type PlaybackMetadataRecord = Readonly<Record<string, unknown>>;

/** The durable playback facts for one room. */
export interface PlaybackRuntime {
  readonly roomId: string;
  readonly state: PlaybackMachineState;
  readonly sessionId: string | null;
  readonly providerId: string | null;
  readonly syncMode: SyncMode;
  readonly ownerProfileId: string | null;
  readonly positionMs: number;
  readonly anchorAt: IsoInstant | null;
  readonly durationMs: number | null;
  readonly startedAt: IsoInstant | null;
  readonly endedAt: IsoInstant | null;
  readonly endReason: SessionEndReason | null;
  readonly errorCode: string | null;
  readonly revision: number;
}

export function idlePlaybackRuntime(roomId: string, providerId: string | null): PlaybackRuntime {
  return Object.freeze({
    roomId,
    state: "idle" as PlaybackMachineState,
    sessionId: null,
    providerId,
    // MVP is manual-sync-first: until a provider proves otherwise, the room
    // coordinates people, not players (ADR-003).
    syncMode: "manual" as SyncMode,
    ownerProfileId: null,
    positionMs: 0,
    anchorAt: null,
    durationMs: null,
    startedAt: null,
    endedAt: null,
    endReason: null,
    errorCode: null,
    revision: 0,
  });
}

const readString = (bag: PlaybackMetadataRecord, key: string): string | null => {
  const raw = bag[key];
  return typeof raw === "string" && raw.length > 0 ? raw : null;
};

const readNumber = (bag: PlaybackMetadataRecord, key: string): number | null => {
  const raw = bag[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
};

/** Rebuilds a runtime from a room metadata bag. Unknown values read as idle. */
export function readPlaybackRuntime(
  roomId: string,
  metadata: PlaybackMetadataRecord,
  providerId: string | null,
): PlaybackRuntime {
  const state = metadata[PLAYBACK_STATE_METADATA_KEY];
  if (!isPlaybackMachineState(state)) return idlePlaybackRuntime(roomId, providerId);

  const syncMode = readString(metadata, PLAYBACK_SYNC_MODE_METADATA_KEY);
  const endReason = readString(metadata, PLAYBACK_END_REASON_METADATA_KEY);

  return Object.freeze({
    roomId,
    state,
    sessionId: readString(metadata, PLAYBACK_SESSION_ID_METADATA_KEY),
    providerId,
    syncMode: syncMode === "controlled" ? "controlled" : "manual",
    ownerProfileId: readString(metadata, PLAYBACK_OWNER_METADATA_KEY),
    positionMs: normalizePosition(readNumber(metadata, PLAYBACK_POSITION_METADATA_KEY) ?? 0),
    anchorAt: readString(metadata, PLAYBACK_ANCHOR_METADATA_KEY),
    durationMs: readNumber(metadata, PLAYBACK_DURATION_METADATA_KEY),
    startedAt: readString(metadata, PLAYBACK_STARTED_AT_METADATA_KEY),
    endedAt: readString(metadata, PLAYBACK_ENDED_AT_METADATA_KEY),
    endReason: (endReason as SessionEndReason | null) ?? null,
    errorCode: readString(metadata, PLAYBACK_ERROR_METADATA_KEY),
    revision: readNumber(metadata, PLAYBACK_REVISION_METADATA_KEY) ?? 0,
  });
}

/** Serializes a runtime back into metadata entries, leaving other keys alone. */
export function writePlaybackRuntime(runtime: PlaybackRuntime): Record<string, unknown> {
  return {
    [PLAYBACK_STATE_METADATA_KEY]: runtime.state,
    [PLAYBACK_SESSION_ID_METADATA_KEY]: runtime.sessionId,
    [PLAYBACK_OWNER_METADATA_KEY]: runtime.ownerProfileId,
    [PLAYBACK_POSITION_METADATA_KEY]: runtime.positionMs,
    [PLAYBACK_ANCHOR_METADATA_KEY]: runtime.anchorAt,
    [PLAYBACK_DURATION_METADATA_KEY]: runtime.durationMs,
    [PLAYBACK_SYNC_MODE_METADATA_KEY]: runtime.syncMode,
    [PLAYBACK_STARTED_AT_METADATA_KEY]: runtime.startedAt,
    [PLAYBACK_ENDED_AT_METADATA_KEY]: runtime.endedAt,
    [PLAYBACK_END_REASON_METADATA_KEY]: runtime.endReason,
    [PLAYBACK_ERROR_METADATA_KEY]: runtime.errorCode,
    [PLAYBACK_REVISION_METADATA_KEY]: runtime.revision,
  };
}

export function toTimeline(runtime: PlaybackRuntime): PlaybackTimeline {
  return createTimeline({
    positionMs: runtime.positionMs,
    anchorAt: runtime.anchorAt,
    isAdvancing: runtime.state === "playing",
    durationMs: runtime.durationMs,
  });
}

export function toSession(runtime: PlaybackRuntime): PlaybackSession | null {
  if (runtime.sessionId === null) return null;
  return Object.freeze({
    id: runtime.sessionId,
    roomId: runtime.roomId,
    providerId: runtime.providerId,
    syncMode: runtime.syncMode,
    ownerProfileId: runtime.ownerProfileId,
    startedAt: runtime.startedAt,
    endedAt: runtime.endedAt,
    endReason: runtime.endReason,
  });
}

/** Projects a runtime onto an instant. Deterministic; never mutates. */
export function projectPlayback(runtime: PlaybackRuntime, now: Date): PlaybackSnapshot {
  const timeline = toTimeline(runtime);
  return Object.freeze({
    roomId: runtime.roomId,
    state: runtime.state,
    session: toSession(runtime),
    timeline,
    positionMs: positionAt(timeline, now),
    ownerProfileId: runtime.ownerProfileId,
    isReady: runtime.state === "ready",
    isAdvancing: runtime.state === "playing",
    errorCode: runtime.errorCode,
    observedAt: now.toISOString(),
  });
}
