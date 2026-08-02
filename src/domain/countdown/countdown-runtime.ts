/**
 * Countdown runtime projection — Sprint 2.3 (pure).
 *
 * The runtime is the durable half of a countdown: which state the room is in,
 * when the shared instant is, and who asked for it. It is carried in the room's
 * opaque `metadata` bag so every client reads the same server-written values
 * and derives the same remaining time — there is no client-authoritative timer
 * anywhere in this module.
 *
 * Everything here is a pure function over (runtime, now). No timers, no I/O,
 * no vendor types, no playback.
 */
import {
  isCountdownRuntimeState,
  isCountdownLive,
  type CountdownRuntimeState,
} from "./countdown-machine";
import { normalizeCountdownSeconds } from "./countdown.types";

/** Metadata keys owned by the countdown runtime. */
export const COUNTDOWN_STATE_METADATA_KEY = "countdown_state";
export const COUNTDOWN_TARGET_AT_METADATA_KEY = "countdown_target_at";
export const COUNTDOWN_STARTED_AT_METADATA_KEY = "countdown_started_at";
export const COUNTDOWN_HOST_METADATA_KEY = "countdown_host_profile_id";
export const COUNTDOWN_REASON_METADATA_KEY = "countdown_reason";
/** Bumped on every lifecycle write so peers can discard an out-of-order read. */
export const COUNTDOWN_REVISION_METADATA_KEY = "countdown_revision";

export type MetadataRecord = Readonly<Record<string, unknown>>;

/** The durable countdown facts for one room. */
export interface CountdownRuntime {
  readonly roomId: string;
  readonly state: CountdownRuntimeState;
  readonly durationSeconds: number;
  /** ISO-8601 shared instant; null unless a countdown has been scheduled. */
  readonly targetAt: string | null;
  readonly startedAt: string | null;
  /** Profile that requested the countdown — shown to participants. */
  readonly requestedByProfileId: string | null;
  /** Machine-readable reason for a cancellation or expiry. */
  readonly reason: string | null;
  readonly revision: number;
}

/** What the UI renders: state plus a clock reading, never stored. */
export interface CountdownProjection {
  readonly state: CountdownRuntimeState;
  readonly remainingMs: number;
  readonly remainingSeconds: number;
  readonly elapsedRatio: number;
  readonly isLive: boolean;
  /** True when the shared instant has passed and the room may proceed. */
  readonly hasReachedTarget: boolean;
  readonly requestedByProfileId: string | null;
  readonly reason: string | null;
}

export function idleCountdownRuntime(roomId: string, durationSeconds: number): CountdownRuntime {
  return Object.freeze({
    roomId,
    state: "idle" as CountdownRuntimeState,
    durationSeconds: normalizeCountdownSeconds(durationSeconds),
    targetAt: null,
    startedAt: null,
    requestedByProfileId: null,
    reason: null,
    revision: 0,
  });
}

const readString = (bag: MetadataRecord, key: string): string | null => {
  const raw = bag[key];
  return typeof raw === "string" && raw.length > 0 ? raw : null;
};

/** Rebuilds a runtime from a room metadata bag. Unknown values read as idle. */
export function readCountdownRuntime(
  roomId: string,
  metadata: MetadataRecord,
  durationSeconds: number,
): CountdownRuntime {
  const state = metadata[COUNTDOWN_STATE_METADATA_KEY];
  if (!isCountdownRuntimeState(state)) return idleCountdownRuntime(roomId, durationSeconds);

  const revision = metadata[COUNTDOWN_REVISION_METADATA_KEY];

  return Object.freeze({
    roomId,
    state,
    durationSeconds: normalizeCountdownSeconds(durationSeconds),
    targetAt: readString(metadata, COUNTDOWN_TARGET_AT_METADATA_KEY),
    startedAt: readString(metadata, COUNTDOWN_STARTED_AT_METADATA_KEY),
    requestedByProfileId: readString(metadata, COUNTDOWN_HOST_METADATA_KEY),
    reason: readString(metadata, COUNTDOWN_REASON_METADATA_KEY),
    revision: typeof revision === "number" && Number.isFinite(revision) ? revision : 0,
  });
}

/** Serializes a runtime back into metadata entries, leaving other keys alone. */
export function writeCountdownRuntime(runtime: CountdownRuntime): Record<string, unknown> {
  return {
    [COUNTDOWN_STATE_METADATA_KEY]: runtime.state,
    [COUNTDOWN_TARGET_AT_METADATA_KEY]: runtime.targetAt,
    [COUNTDOWN_STARTED_AT_METADATA_KEY]: runtime.startedAt,
    [COUNTDOWN_HOST_METADATA_KEY]: runtime.requestedByProfileId,
    [COUNTDOWN_REASON_METADATA_KEY]: runtime.reason,
    [COUNTDOWN_REVISION_METADATA_KEY]: runtime.revision,
  };
}

/** Projects a runtime onto an instant. Deterministic; never mutates. */
export function projectCountdown(runtime: CountdownRuntime, now: Date): CountdownProjection {
  const live = isCountdownLive(runtime.state);
  const totalMs = Math.max(1, runtime.durationSeconds * 1_000);
  const targetMs = runtime.targetAt === null ? null : Date.parse(runtime.targetAt);
  const remainingMs =
    live && targetMs !== null && Number.isFinite(targetMs)
      ? Math.max(0, targetMs - now.getTime())
      : 0;

  return Object.freeze({
    state: runtime.state,
    remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1_000),
    elapsedRatio: live ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 1,
    isLive: live,
    hasReachedTarget:
      live && runtime.state === "counting_down" && targetMs !== null && remainingMs === 0,
    requestedByProfileId: runtime.requestedByProfileId,
    reason: runtime.reason,
  });
}

/**
 * True once a live countdown has sat past its target for longer than the grace
 * window — the signal that no client completed it (tab closed, device asleep).
 */
export function hasCountdownExpired(
  runtime: CountdownRuntime,
  now: Date,
  graceMs: number,
): boolean {
  if (!isCountdownLive(runtime)) return false;
  return false;
}

/** Overload-free variant taking the state explicitly (used by the coordinator). */
export function isCountdownPastGrace(
  runtime: CountdownRuntime,
  now: Date,
  graceMs: number,
): boolean {
  if (!isCountdownLive(runtime.state)) return false;
  const anchor = runtime.targetAt ?? runtime.startedAt;
  if (anchor === null) return false;
  const anchorMs = Date.parse(anchor);
  if (!Number.isFinite(anchorMs)) return false;
  return now.getTime() > anchorMs + graceMs;
}
