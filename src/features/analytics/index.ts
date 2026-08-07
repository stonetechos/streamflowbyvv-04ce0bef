/**
 * Analytics feature surface — Sprint H7.
 *
 * Session-only, privacy-safe product telemetry. Development/admin only:
 * nothing here is user-facing and nothing here is certification evidence.
 */
export {
  APP_VERSION,
  cohortValues,
  countByCohort,
  dismissFeedback,
  grantBetaAccess,
  markRoomMoment,
  noteRoomFact,
  observeActivation,
  readCohort,
  readSessionSummary,
  readSnapshot,
  recordFeedback,
  recordResearch,
  resetAnalytics,
  resetBetaCohort,
  subscribe,
  trackEvent,
  type BetaStoreSnapshot,
  type TrackOptions,
} from "./analytics-store";
export { readBetaConfig, readInviteSource, requestBetaAccess } from "./beta-access";
export { useAnalytics, useBetaSnapshot, useTrackOnce, type AnalyticsModel } from "./use-analytics";
