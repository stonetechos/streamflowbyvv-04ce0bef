/**
 * Playback state machine — Sprint 2.4.
 *
 * A pure, deterministic transition table for what playback *should* be doing.
 * It owns no timer, no storage, no vendor, and — importantly for this sprint —
 * no player: nothing here can touch a provider, a browser tab, or a media
 * element. It answers exactly one question: given a state and an intent, what
 * is the next state, or is the intent refused?
 *
 * States are the eight named in the sprint contract:
 *   idle -> queued -> ready -> playing <-> paused, playing -> seeking,
 *   and playing/paused/seeking -> completed, with `error` reachable from any
 *   non-terminal state.
 */

export const PLAYBACK_MACHINE_STATES = [
  "idle",
  "queued",
  "ready",
  "playing",
  "paused",
  "seeking",
  "completed",
  "error",
] as const;
export type PlaybackMachineState = (typeof PLAYBACK_MACHINE_STATES)[number];

export const PLAYBACK_ACTIONS = [
  "queue",
  "arm",
  "play",
  "pause",
  "resume",
  "seek",
  "settle",
  "complete",
  "fail",
  "reset",
] as const;
export type PlaybackAction = (typeof PLAYBACK_ACTIONS)[number];

/**
 * The whole rule set. An absent pair is a forbidden transition — the
 * coordinator cannot invent one, and Presentation cannot ask for one.
 *
 * `queue` records that the room has decided what to watch; `arm` is the
 * post-countdown "everyone is ready" moment. Neither starts media.
 */
const TRANSITIONS: Readonly<
  Record<PlaybackMachineState, Partial<Record<PlaybackAction, PlaybackMachineState>>>
> = Object.freeze({
  idle: { queue: "queued", fail: "error" },
  queued: { arm: "ready", queue: "queued", complete: "completed", fail: "error", reset: "idle" },
  // `ready` is where Sprint 2.4 stops: the room is armed, and a human presses
  // play in their own provider. `play` here records that intent, it does not
  // perform it.
  ready: { play: "playing", complete: "completed", fail: "error", reset: "idle" },
  playing: {
    pause: "paused",
    seek: "seeking",
    complete: "completed",
    fail: "error",
  },
  paused: {
    resume: "playing",
    seek: "seeking",
    complete: "completed",
    fail: "error",
  },
  // A seek settles back into the state the room asked to be in; the
  // coordinator supplies `settle` once the new position is agreed.
  seeking: { settle: "playing", pause: "paused", complete: "completed", fail: "error" },
  completed: { reset: "idle", queue: "queued" },
  error: { reset: "idle", queue: "queued" },
});

export function canPlaybackTransition(
  from: PlaybackMachineState,
  action: PlaybackAction,
): boolean {
  return TRANSITIONS[from][action] !== undefined;
}

/** Returns the next state, or null when the transition is not permitted. */
export function nextPlaybackState(
  from: PlaybackMachineState,
  action: PlaybackAction,
): PlaybackMachineState | null {
  return TRANSITIONS[from][action] ?? null;
}

/** True once the room is armed but before anything terminal happened. */
export function isPlaybackActive(state: PlaybackMachineState): boolean {
  return state === "ready" || state === "playing" || state === "paused" || state === "seeking";
}

export function isPlaybackTerminal(state: PlaybackMachineState): boolean {
  return state === "completed" || state === "error";
}

/** ADR-004: the screen reads the status, never a derived boolean. */
export function isPlaybackAdvancing(state: PlaybackMachineState): boolean {
  return state === "playing";
}

export function isPlaybackMachineState(value: unknown): value is PlaybackMachineState {
  return (
    typeof value === "string" && (PLAYBACK_MACHINE_STATES as readonly string[]).includes(value)
  );
}
