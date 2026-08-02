/**
 * Countdown domain models — Sprint 2.2 (models only).
 *
 * The countdown ENGINE is Sprint 2.3. What exists here is the vocabulary it
 * will run on: a target, a state, and a progress projection derived purely
 * from two instants. Nothing in this module starts a timer, schedules work,
 * publishes an event, or touches storage.
 *
 * Every number comes from `COUNTDOWN` in system-constants (Build Rules §10).
 */
import { COUNTDOWN } from "@/shared/constants/system-constants";

export const COUNTDOWN_STATES = ["idle", "scheduled", "firing", "fired", "cancelled"] as const;
export type CountdownState = (typeof COUNTDOWN_STATES)[number];

/** An agreed instant to press play together — Foundation §14.1. */
export interface CountdownTarget {
  readonly roomId: string;
  /** ISO-8601 UTC instant everyone counts down to. */
  readonly targetAt: string;
  readonly durationSeconds: number;
  readonly scheduledAt: string;
  readonly scheduledByProfileId: string | null;
}

/** A pure projection of a target against a clock reading. */
export interface CountdownProgress {
  readonly state: CountdownState;
  readonly remainingMs: number;
  /** Whole seconds remaining, floored at zero — what the UI announces. */
  readonly remainingSeconds: number;
  /** 0 at scheduling time, 1 at the target. */
  readonly elapsedRatio: number;
  readonly isComplete: boolean;
}

export const IDLE_COUNTDOWN_PROGRESS: CountdownProgress = Object.freeze({
  state: "idle",
  remainingMs: 0,
  remainingSeconds: 0,
  elapsedRatio: 0,
  isComplete: false,
});

/** Clamps a caller-chosen duration into the specified 3–60 second envelope. */
export function normalizeCountdownSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return COUNTDOWN.DEFAULT_SECONDS;
  const whole = Math.round(seconds);
  return Math.min(COUNTDOWN.MAX_SECONDS, Math.max(COUNTDOWN.MIN_SECONDS, whole));
}

export function isCountdownSecondsValid(seconds: number): boolean {
  return (
    Number.isInteger(seconds) &&
    seconds >= COUNTDOWN.MIN_SECONDS &&
    seconds <= COUNTDOWN.MAX_SECONDS
  );
}
