/**
 * Room runtime — Sprint H5.
 *
 * The control plane, expressed as pure rules. This module owns the room's
 * authoritative playback state, the commands allowed to change it, the drift
 * policy that may be applied to an adapter the application actually controls,
 * participant readiness, and the coordination requests that stand in for
 * control we do not have.
 *
 * Control plane (here): phase, media reference, countdown, host actions,
 * playback events, sync status, readiness, chat, presence, reconnect.
 * Media plane (never here): OTT playback, provider auth, subtitles, audio
 * tracks, device volume, provider-native fullscreen and zoom, DRM.
 *
 * ADR-014 remains binding: for a launch-only provider nothing in this file
 * may claim, imply, or simulate playback control.
 */
import type { PlaybackControlMode, WatchProviderCapability } from "./watch-source";
import type { WatchState } from "./watch-sync-service";

// ---------------------------------------------------------------- state ----

/** Authoritative playback status shared by every client in the room. */
export type PlaybackStatusValue =
  | "idle"
  | "countdown"
  | "playing"
  | "paused"
  | "seeking"
  | "buffering"
  | "ended"
  | "manual-sync";

/**
 * Server-authoritative playback state. `revision` is strictly increasing and
 * is the only thing a client compares: an older revision is discarded, never
 * merged.
 */
export interface PlaybackState {
  readonly status: PlaybackStatusValue;
  readonly positionSeconds: number;
  /** Server instant `positionSeconds` was true at, in epoch milliseconds. */
  readonly anchorServerTimeMs: number;
  readonly playbackRate: number;
  readonly revision: number;
  readonly changedByParticipantId?: string;
  readonly changedAtServerMs: number;
}

export interface PlaybackStateInput {
  /** True while the room's shared countdown is running. */
  readonly isCountingDown: boolean;
  /** How the active provider is driven. Launch-only never reports transport. */
  readonly controlMode: PlaybackControlMode;
}

function statusFrom(state: WatchState, input: PlaybackStateInput): PlaybackStatusValue {
  if (input.isCountingDown) return "countdown";
  // A provider we cannot drive is described honestly, whatever the row says.
  if (input.controlMode !== "automatic") return "manual-sync";
  switch (state.phase) {
    case "playing":
      return "playing";
    case "paused":
      return "paused";
    case "buffering":
      return "buffering";
    case "ended":
      return "ended";
    default:
      return "idle";
  }
}

/** Projects the durable row into the shared H5 playback state. */
export function toPlaybackState(state: WatchState, input: PlaybackStateInput): PlaybackState {
  const anchorMs = state.anchorAt ? Date.parse(state.anchorAt) : Number.NaN;
  const changedMs = Date.parse(state.updatedAt);
  return {
    status: statusFrom(state, input),
    positionSeconds: Math.max(0, state.positionMs) / 1000,
    anchorServerTimeMs: Number.isNaN(anchorMs) ? 0 : anchorMs,
    playbackRate: state.rate > 0 ? state.rate : 1,
    revision: state.version,
    ...(state.lastActorProfileId ? { changedByParticipantId: state.lastActorProfileId } : {}),
    changedAtServerMs: Number.isNaN(changedMs) ? 0 : changedMs,
  };
}

/** The idle state a client uses before the first snapshot arrives. */
export function emptyPlaybackState(nowServerMs: number): PlaybackState {
  return {
    status: "idle",
    positionSeconds: 0,
    anchorServerTimeMs: 0,
    playbackRate: 1,
    revision: -1,
    changedAtServerMs: nowServerMs,
  };
}

/**
 * Where the room is right now, in media seconds. `nowServerMs` must already
 * carry the estimated client/server clock offset — a raw device clock is never
 * trusted (§ authoritative playback state).
 */
export function projectPositionSeconds(state: PlaybackState, nowServerMs: number): number {
  if (state.status !== "playing" || state.anchorServerTimeMs <= 0) return state.positionSeconds;
  const elapsedMs = Math.max(0, nowServerMs - state.anchorServerTimeMs);
  return state.positionSeconds + (elapsedMs / 1000) * state.playbackRate;
}

/** True when `incoming` is newer than what the client already applied. */
export function isFreshRevision(applied: number, incoming: number): boolean {
  return incoming > applied;
}

/** Keeps the newer of two states; a stale arrival is discarded unchanged. */
export function reduceState(current: PlaybackState | null, incoming: PlaybackState): PlaybackState {
  if (!current) return incoming;
  return isFreshRevision(current.revision, incoming.revision) ? incoming : current;
}

// -------------------------------------------------------------- commands ----

export type RoomCommandKind =
  | "play"
  | "pause"
  | "seek"
  | "restart"
  | "start-countdown"
  | "finish-countdown";

export type RoomCommand =
  | { readonly kind: "play"; readonly positionSeconds: number }
  | { readonly kind: "pause"; readonly positionSeconds: number }
  | { readonly kind: "seek"; readonly positionSeconds: number; readonly playing: boolean }
  | { readonly kind: "restart" }
  | { readonly kind: "start-countdown" }
  | { readonly kind: "finish-countdown" };

export type CommandRejection =
  | "not-host"
  | "room-closed"
  | "media-invalid"
  | "media-missing"
  | "not-controllable"
  | "stale-revision"
  | "unavailable";

export interface CommandContext {
  readonly isHost: boolean;
  readonly roomClosed: boolean;
  readonly hasMedia: boolean;
  readonly mediaValid: boolean;
  readonly controlMode: PlaybackControlMode;
  /** Revision the caller believes is current; omit when it does not know. */
  readonly expectedRevision?: number;
  readonly currentRevision: number;
}

export type CommandVerdict =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: CommandRejection };

const TRANSPORT_KINDS: readonly RoomCommandKind[] = ["play", "pause", "seek", "restart"];

/**
 * The single authorization rule for every state-changing command. Order
 * matters: a closed room refuses everything, and a provider we cannot drive
 * refuses transport before permissions are even considered.
 */
export function authorizeCommand(command: RoomCommand, context: CommandContext): CommandVerdict {
  if (context.roomClosed) return { allowed: false, reason: "room-closed" };
  if (!context.isHost) return { allowed: false, reason: "not-host" };
  if (!context.hasMedia) return { allowed: false, reason: "media-missing" };
  if (!context.mediaValid) return { allowed: false, reason: "media-invalid" };

  if (TRANSPORT_KINDS.includes(command.kind) && context.controlMode !== "automatic") {
    return { allowed: false, reason: "not-controllable" };
  }

  if (
    context.expectedRevision !== undefined &&
    context.expectedRevision < context.currentRevision
  ) {
    return { allowed: false, reason: "stale-revision" };
  }

  return { allowed: true };
}

// ----------------------------------------------------------- drift policy ----

export interface DriftPolicy {
  /** Below this absolute drift nothing is corrected. */
  readonly ignoreBelowMs: number;
  /** Up to this drift the player is nudged by rate; above it, a hard seek. */
  readonly softUntilMs: number;
  /** Rate applied inside the soft band. */
  readonly softRate: number;
  /** Corrections are suppressed for this long after an explicit seek. */
  readonly seekCooldownMs: number;
}

/** Conservative starting point (§ automatic sources). Adapters may override. */
export const DEFAULT_DRIFT_POLICY: DriftPolicy = Object.freeze({
  ignoreBelowMs: 150,
  softUntilMs: 1_000,
  softRate: 1.05,
  seekCooldownMs: 1_500,
});

/**
 * The drift policy for a provider, or null when there is nothing to correct.
 * Launch-only, assisted, manual and unavailable providers get null: the
 * application does not touch their media plane, so it has no drift to fix.
 */
export function resolveDriftPolicy(
  capability: Pick<WatchProviderCapability, "playbackControlMode">,
  override?: Partial<DriftPolicy>,
): DriftPolicy | null {
  if (capability.playbackControlMode !== "automatic") return null;
  return { ...DEFAULT_DRIFT_POLICY, ...override };
}

export type DriftCorrection = "none" | "soft" | "hard" | "suppressed";

export interface DriftConditions {
  readonly isBuffering: boolean;
  /** Milliseconds since the last explicit seek, or null when there was none. */
  readonly msSinceSeek: number | null;
}

export function classifyDrift(
  driftMs: number | null,
  policy: DriftPolicy | null,
  conditions: DriftConditions,
): DriftCorrection {
  if (policy === null || driftMs === null || !Number.isFinite(driftMs)) return "none";
  if (conditions.isBuffering) return "suppressed";
  if (conditions.msSinceSeek !== null && conditions.msSinceSeek < policy.seekCooldownMs) {
    return "suppressed";
  }
  const magnitude = Math.abs(driftMs);
  if (magnitude < policy.ignoreBelowMs) return "none";
  if (magnitude <= policy.softUntilMs) return "soft";
  return "hard";
}

/** What the person is told about their own sync, never what we assert of others. */
export type SyncStatusLabel = "synced" | "catching-up" | "recovering" | "manual" | "unknown";

export function syncStatusFor(
  correction: DriftCorrection,
  policy: DriftPolicy | null,
): SyncStatusLabel {
  if (policy === null) return "manual";
  switch (correction) {
    case "none":
      return "synced";
    case "soft":
      return "catching-up";
    case "hard":
      return "recovering";
    default:
      return "unknown";
  }
}

// ----------------------------------------------------------- readiness ------

export type ParticipantRuntimeState =
  | "joined"
  | "selecting"
  | "ready"
  | "watching"
  | "reconnecting"
  | "disconnected"
  | "left";

export interface ParticipantRuntime {
  readonly participantId: string;
  readonly displayName: string;
  readonly isHost: boolean;
  readonly state: ParticipantRuntimeState;
}

export type ReadinessThreshold =
  | { readonly kind: "host-only" }
  | { readonly kind: "all-ready" }
  | { readonly kind: "percentage"; readonly percent: number };

/** MVP default: the host starts, and everybody can see who is ready. */
export const DEFAULT_READINESS_THRESHOLD: ReadinessThreshold = Object.freeze({ kind: "host-only" });

export interface ReadinessSummary {
  readonly readyCount: number;
  readonly total: number;
  readonly waitingFor: readonly string[];
  readonly thresholdMet: boolean;
}

const READY_STATES: readonly ParticipantRuntimeState[] = ["ready", "watching"];
const COUNTED_STATES: readonly ParticipantRuntimeState[] = [
  "joined",
  "selecting",
  "ready",
  "watching",
  "reconnecting",
];

export function summarizeReadiness(
  participants: readonly ParticipantRuntime[],
  threshold: ReadinessThreshold = DEFAULT_READINESS_THRESHOLD,
): ReadinessSummary {
  const counted = participants.filter((participant) => COUNTED_STATES.includes(participant.state));
  const ready = counted.filter((participant) => READY_STATES.includes(participant.state));
  const waitingFor = counted
    .filter((participant) => !READY_STATES.includes(participant.state))
    .map((participant) => participant.displayName);

  const ratio = counted.length === 0 ? 0 : ready.length / counted.length;
  const thresholdMet =
    threshold.kind === "host-only"
      ? true
      : threshold.kind === "all-ready"
        ? counted.length > 0 && ready.length === counted.length
        : ratio * 100 >= threshold.percent;

  return { readyCount: ready.length, total: counted.length, waitingFor, thresholdMet };
}

// -------------------------------------------------------------- events ------

export type RoomEventType =
  | "room.snapshot"
  | "room.phase.changed"
  | "media.selected"
  | "countdown.started"
  | "countdown.finished"
  | "playback.play"
  | "playback.pause"
  | "playback.seek"
  | "playback.heartbeat"
  | "playback.resync-requested"
  | "participant.ready"
  | "participant.joined"
  | "participant.reconnected"
  | "participant.left"
  | "chat.message";

export interface RoomEvent {
  readonly roomId: string;
  readonly eventId: string;
  readonly type: RoomEventType;
  readonly serverTimeMs: number;
  /** Present on every state-changing event; null for observations. */
  readonly roomRevision: number | null;
  readonly participantId: string | null;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface RoomEventInput {
  readonly roomId: string;
  readonly type: RoomEventType;
  readonly serverTimeMs: number;
  readonly roomRevision?: number | null;
  readonly participantId?: string | null;
  readonly payload?: Readonly<Record<string, unknown>>;
  /** Injectable so the domain stays pure and testable. */
  readonly eventId?: string;
}

const STATE_CHANGING: readonly RoomEventType[] = [
  "room.phase.changed",
  "media.selected",
  "countdown.started",
  "countdown.finished",
  "playback.play",
  "playback.pause",
  "playback.seek",
  "participant.ready",
  "participant.joined",
  "participant.reconnected",
  "participant.left",
];

export function isStateChanging(type: RoomEventType): boolean {
  return STATE_CHANGING.includes(type);
}

export function createRoomEvent(input: RoomEventInput): RoomEvent {
  return {
    roomId: input.roomId,
    eventId: input.eventId ?? crypto.randomUUID(),
    type: input.type,
    serverTimeMs: input.serverTimeMs,
    roomRevision: input.roomRevision ?? null,
    participantId: input.participantId ?? null,
    payload: input.payload ?? {},
  };
}

/**
 * A state-changing event carrying a revision at or below what the client has
 * already applied is stale and must be dropped. Observations never expire.
 */
export function isStaleEvent(event: RoomEvent, appliedRevision: number): boolean {
  if (!isStateChanging(event.type)) return false;
  if (event.roomRevision === null) return false;
  return event.roomRevision <= appliedRevision;
}

// ------------------------------------------------------- coordination -------

/**
 * What a room can ask of people when it cannot ask anything of their player.
 * A request is a message to humans; it never mutates playback state.
 */
export type CoordinationKind =
  | "pause-request"
  | "resume-request"
  | "resync-request"
  | "provider-launched"
  | "ready";

export interface CoordinationRequest {
  readonly kind: CoordinationKind;
  readonly participantId: string;
  readonly at: string;
  readonly acknowledgedBy: readonly string[];
}

export const COORDINATION_METADATA_KEY = "sf_coordination";

/** Serializes a request for the durable room event channel. */
export function encodeCoordination(kind: CoordinationKind): Readonly<Record<string, unknown>> {
  return { [COORDINATION_METADATA_KEY]: { kind, v: 1 } };
}

export function decodeCoordination(
  metadata: Readonly<Record<string, unknown>> | undefined,
): CoordinationKind | null {
  const raw = metadata?.[COORDINATION_METADATA_KEY];
  if (!raw || typeof raw !== "object") return null;
  const kind = (raw as { kind?: unknown }).kind;
  const known: readonly string[] = [
    "pause-request",
    "resume-request",
    "resync-request",
    "provider-launched",
    "ready",
  ];
  return typeof kind === "string" && known.includes(kind) ? (kind as CoordinationKind) : null;
}

/**
 * A launch-only room never claims a device did anything. This states exactly
 * what is known: how many people said so themselves.
 */
export interface CoordinationClaim {
  readonly kind: CoordinationKind;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly confirmedParticipantIds: readonly string[];
  readonly verified: false;
}
