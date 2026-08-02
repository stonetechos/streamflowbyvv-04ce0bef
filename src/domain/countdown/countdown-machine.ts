/**
 * Countdown state machine — Sprint 2.3.
 *
 * A pure, deterministic transition table. It holds no timer, no storage, and
 * no vendor: given a state and an action it answers with the next state, or
 * refuses. Every rule about what may follow what lives here and nowhere else,
 * so the coordinator (which does own I/O) cannot invent a transition.
 *
 * States are the six named in the sprint contract:
 *   idle -> preparing -> counting_down -> completed | cancelled | expired
 */

export const COUNTDOWN_RUNTIME_STATES = [
  "idle",
  "preparing",
  "counting_down",
  "cancelled",
  "completed",
  "expired",
] as const;
export type CountdownRuntimeState = (typeof COUNTDOWN_RUNTIME_STATES)[number];

export const COUNTDOWN_ACTIONS = [
  "prepare",
  "start",
  "cancel",
  "complete",
  "expire",
  "reset",
] as const;
export type CountdownAction = (typeof COUNTDOWN_ACTIONS)[number];

/** The whole rule set. Absent pair = forbidden transition. */
const TRANSITIONS: Readonly<
  Record<CountdownRuntimeState, Partial<Record<CountdownAction, CountdownRuntimeState>>>
> = Object.freeze({
  idle: { prepare: "preparing" },
  // `start` is the only way into a live countdown; `cancel` covers a host who
  // changes their mind while the target instant is still being written.
  preparing: { start: "counting_down", cancel: "cancelled", reset: "idle" },
  counting_down: {
    cancel: "cancelled",
    complete: "completed",
    expire: "expired",
    // A restart is modelled as cancel-then-prepare by the coordinator, never
    // as a silent re-entry into counting_down.
  },
  // Terminal states are re-enterable only through an explicit reset/prepare,
  // which is what makes "Restart Countdown" an intentional, auditable act.
  cancelled: { prepare: "preparing", reset: "idle" },
  completed: { prepare: "preparing", reset: "idle" },
  expired: { prepare: "preparing", reset: "idle" },
});

export function canTransition(from: CountdownRuntimeState, action: CountdownAction): boolean {
  return TRANSITIONS[from][action] !== undefined;
}

/** Returns the next state, or null when the transition is not permitted. */
export function nextCountdownState(
  from: CountdownRuntimeState,
  action: CountdownAction,
): CountdownRuntimeState | null {
  return TRANSITIONS[from][action] ?? null;
}

/** True while the room is between "host asked" and "everyone should press play". */
export function isCountdownLive(state: CountdownRuntimeState): boolean {
  return state === "preparing" || state === "counting_down";
}

export function isCountdownTerminal(state: CountdownRuntimeState): boolean {
  return state === "cancelled" || state === "completed" || state === "expired";
}

export function isCountdownRuntimeState(value: unknown): value is CountdownRuntimeState {
  return (
    typeof value === "string" &&
    (COUNTDOWN_RUNTIME_STATES as readonly string[]).includes(value)
  );
}
