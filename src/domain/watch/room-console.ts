/**
 * Live room console — Phase A.
 *
 * What a room can honestly say about itself when the application cannot see
 * the provider's player (ADR-014). Everything here is derived from facts the
 * room already owns: the shared selection, the countdown, the authoritative
 * `room_state` row when a source is actually driven, and the host's own
 * declarations broadcast through the coordination stream.
 *
 * Two clocks exist and they are never confused:
 *  - `measured` — projected from `room_state.anchor_server_time`, only when
 *    the application itself drives the media plane;
 *  - `declared` — accumulated from the host saying "we're starting" and
 *    "we paused". It is a statement by a human, and it is labelled as one.
 *
 * Nothing in this module asserts that anybody's device is playing.
 */

/** The five states a room can be in, from the room's own point of view. */
export type RoomConsolePhase =
  | "lobby"
  | "counting-down"
  | "watching"
  | "paused-by-host"
  | "manual-sync";

/** A statement the host made about the room. Never a device observation. */
export type HostDeclarationKind = "started" | "paused" | "resumed";

export interface HostDeclaration {
  readonly kind: HostDeclarationKind;
  readonly atMs: number;
}

export type RoomConsoleAction = "declare-start" | "declare-pause" | "declare-resume" | "restart-countdown";

export type RoomClockKind = "measured" | "declared" | "none";

export interface RoomConsoleClock {
  readonly kind: RoomClockKind;
  readonly elapsedMs: number;
  /** True while the clock is advancing; a paused room freezes its readout. */
  readonly isRunning: boolean;
  readonly labelKey: string;
}

export interface RoomConsoleInput {
  /** Something has been chosen for the room. */
  readonly hasSource: boolean;
  /** True only when StreamFlow itself drives the media plane. */
  readonly isAutomatic: boolean;
  readonly isHost: boolean;
  readonly countdownSeconds: number | null;
  /** Status of the authoritative row, for automatic rooms only. */
  readonly playbackStatus: string;
  /** Projected media position in seconds, for automatic rooms only. */
  readonly positionSeconds: number;
  /** Host declarations in the order they were made, oldest first. */
  readonly declarations: readonly HostDeclaration[];
  readonly nowMs: number;
  readonly roomEnded: boolean;
  /** A countdown can be started at all (host, backend reachable). */
  readonly canStartCountdown: boolean;
}

export interface RoomConsoleView {
  readonly phase: RoomConsolePhase;
  readonly phaseKey: string;
  readonly clock: RoomConsoleClock;
  /** Honest capability disclosure. Empty for a room we genuinely drive. */
  readonly disclosureKeys: readonly string[];
  /** Host-only actions, already filtered by what the room state allows. */
  readonly hostActions: readonly RoomConsoleAction[];
  /** True when the room is coordinated by humans rather than by the app. */
  readonly isManual: boolean;
}

const PHASE_KEYS: Readonly<Record<RoomConsolePhase, string>> = {
  lobby: "room.console.phase.lobby",
  "counting-down": "room.console.phase.counting_down",
  watching: "room.console.phase.watching",
  "paused-by-host": "room.console.phase.paused",
  "manual-sync": "room.console.phase.manual",
};

/**
 * Folds host declarations into a stopwatch. A start or resume opens a running
 * segment; a pause closes it. Out-of-order or duplicate statements are
 * absorbed rather than double-counted.
 */
export function projectDeclaredClock(
  declarations: readonly HostDeclaration[],
  nowMs: number,
): { readonly elapsedMs: number; readonly isRunning: boolean; readonly hasStarted: boolean } {
  let elapsed = 0;
  let runningSince: number | null = null;
  let hasStarted = false;

  for (const declaration of [...declarations].sort((a, b) => a.atMs - b.atMs)) {
    if (declaration.kind === "started") {
      // A fresh start resets the room's stopwatch: it is a new sitting.
      elapsed = 0;
      runningSince = declaration.atMs;
      hasStarted = true;
      continue;
    }
    if (declaration.kind === "resumed") {
      if (runningSince === null) runningSince = declaration.atMs;
      hasStarted = true;
      continue;
    }
    if (runningSince !== null) {
      elapsed += Math.max(0, declaration.atMs - runningSince);
      runningSince = null;
    }
    hasStarted = hasStarted || elapsed > 0;
  }

  if (runningSince !== null) elapsed += Math.max(0, nowMs - runningSince);
  return { elapsedMs: elapsed, isRunning: runningSince !== null, hasStarted };
}

/** The newest declaration, or null when the host has said nothing yet. */
export function latestDeclaration(
  declarations: readonly HostDeclaration[],
): HostDeclaration | null {
  if (declarations.length === 0) return null;
  return [...declarations].sort((a, b) => a.atMs - b.atMs)[declarations.length - 1] ?? null;
}

export function deriveRoomConsole(input: RoomConsoleInput): RoomConsoleView {
  const {
    hasSource,
    isAutomatic,
    isHost,
    countdownSeconds,
    playbackStatus,
    positionSeconds,
    declarations,
    nowMs,
    roomEnded,
    canStartCountdown,
  } = input;

  const declared = projectDeclaredClock(declarations, nowMs);
  const last = latestDeclaration(declarations);

  const phase: RoomConsolePhase = (() => {
    if (countdownSeconds !== null) return "counting-down";
    if (isAutomatic) {
      if (playbackStatus === "playing") return "watching";
      if (playbackStatus === "paused") return "paused-by-host";
      return hasSource ? "manual-sync" : "lobby";
    }
    if (!hasSource) return "lobby";
    if (declared.isRunning) return "watching";
    if (last?.kind === "paused") return "paused-by-host";
    return "manual-sync";
  })();

  const clock: RoomConsoleClock = isAutomatic
    ? {
        kind: "measured",
        elapsedMs: Math.max(0, Math.round(positionSeconds * 1000)),
        isRunning: playbackStatus === "playing",
        labelKey: "room.console.clock.measured",
      }
    : declared.hasStarted
      ? {
          kind: "declared",
          elapsedMs: declared.elapsedMs,
          isRunning: declared.isRunning,
          labelKey: "room.console.clock.declared",
        }
      : {
          kind: "none",
          elapsedMs: 0,
          isRunning: false,
          labelKey: "room.console.clock.none",
        };

  const disclosureKeys = isAutomatic
    ? []
    : ["room.console.disclosure.no_read", "room.console.disclosure.manual"];

  const hostActions: RoomConsoleAction[] = [];
  if (isHost && hasSource && !roomEnded && !isAutomatic) {
    if (countdownSeconds === null) {
      if (!declared.hasStarted) hostActions.push("declare-start");
      else if (declared.isRunning) hostActions.push("declare-pause");
      else hostActions.push("declare-resume");
      if (canStartCountdown) hostActions.push("restart-countdown");
    }
  }

  return {
    phase,
    phaseKey: PHASE_KEYS[phase],
    clock,
    disclosureKeys,
    hostActions,
    isManual: !isAutomatic,
  };
}

/** mm:ss, or h:mm:ss past an hour. Never negative. */
export function formatRoomClock(elapsedMs: number): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

// --------------------------------------------------------- participants -----

/** How fresh a person's presence signal is. Observation only. */
export type PresenceFreshness = "live" | "stale" | "offline";

export function classifyFreshness(
  liveness: string,
  lastSeenMs: number | null,
  nowMs: number,
  staleAfterMs = 45_000,
): PresenceFreshness {
  if (liveness === "offline" || liveness === "left") return "offline";
  if (lastSeenMs !== null && nowMs - lastSeenMs > staleAfterMs) return "stale";
  if (liveness === "away" || liveness === "reconnecting") return "stale";
  return "live";
}
