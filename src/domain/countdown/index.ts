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

/** Sprint 2.3 — countdown runtime: state machine and pure projection. */
export {
  COUNTDOWN_ACTIONS,
  COUNTDOWN_RUNTIME_STATES,
  canTransition,
  isCountdownLive,
  isCountdownRuntimeState,
  isCountdownTerminal,
  nextCountdownState,
  type CountdownAction,
  type CountdownRuntimeState,
} from "./countdown-machine";
export {
  COUNTDOWN_HOST_METADATA_KEY,
  COUNTDOWN_REASON_METADATA_KEY,
  COUNTDOWN_REVISION_METADATA_KEY,
  COUNTDOWN_STARTED_AT_METADATA_KEY,
  COUNTDOWN_STATE_METADATA_KEY,
  COUNTDOWN_TARGET_AT_METADATA_KEY,
  idleCountdownRuntime,
  isCountdownPastGrace,
  projectCountdown,
  readCountdownRuntime,
  writeCountdownRuntime,
  type CountdownProjection,
  type CountdownRuntime,
  type MetadataRecord,
} from "./countdown-runtime";
