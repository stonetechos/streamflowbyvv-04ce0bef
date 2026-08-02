/**
 * Countdown domain surface — Sprint 2.2 (models and pure derivation only).
 * The scheduling engine arrives in Sprint 2.3.
 */
export {
  COUNTDOWN_STATES,
  IDLE_COUNTDOWN_PROGRESS,
  isCountdownSecondsValid,
  normalizeCountdownSeconds,
  type CountdownProgress,
  type CountdownState,
  type CountdownTarget,
} from "./countdown.types";
export { planCountdown, progressAt, type CountdownPlanInput } from "./countdown-plan";
