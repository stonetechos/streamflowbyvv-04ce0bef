/**
 * Countdown planning — Sprint 2.2, pure functions only.
 *
 * `planCountdown` describes a countdown; it does not start one. `progressAt`
 * answers "how far along would that plan be at this instant". Both are
 * referentially transparent, which is what lets Sprint 2.3 drive them from a
 * server-anchored clock without rewriting the rules.
 */
import {
  IDLE_COUNTDOWN_PROGRESS,
  normalizeCountdownSeconds,
  type CountdownProgress,
  type CountdownState,
  type CountdownTarget,
} from "./countdown.types";

export interface CountdownPlanInput {
  readonly roomId: string;
  readonly durationSeconds: number;
  readonly scheduledByProfileId: string | null;
}

/** Builds a target `durationSeconds` after `now`, clamped to the envelope. */
export function planCountdown(input: CountdownPlanInput, now: Date): CountdownTarget {
  const durationSeconds = normalizeCountdownSeconds(input.durationSeconds);
  return Object.freeze({
    roomId: input.roomId,
    durationSeconds,
    scheduledAt: now.toISOString(),
    targetAt: new Date(now.getTime() + durationSeconds * 1_000).toISOString(),
    scheduledByProfileId: input.scheduledByProfileId,
  });
}

/**
 * Projects a target onto an instant. A cancelled countdown is reported by the
 * caller passing `cancelled: true`; this function never infers intent.
 */
export function progressAt(
  target: CountdownTarget | null,
  now: Date,
  options: { readonly cancelled?: boolean } = {},
): CountdownProgress {
  if (!target) return IDLE_COUNTDOWN_PROGRESS;
  if (options.cancelled) {
    return Object.freeze({ ...IDLE_COUNTDOWN_PROGRESS, state: "cancelled" as CountdownState });
  }

  const totalMs = Math.max(1, target.durationSeconds * 1_000);
  const remainingMs = Math.max(0, Date.parse(target.targetAt) - now.getTime());
  const isComplete = remainingMs === 0;

  return Object.freeze({
    state: isComplete ? "fired" : remainingMs <= 1_000 ? "firing" : "scheduled",
    remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1_000),
    elapsedRatio: Math.min(1, Math.max(0, 1 - remainingMs / totalMs)),
    isComplete,
  });
}
