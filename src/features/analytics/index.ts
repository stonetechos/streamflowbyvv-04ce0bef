/**
 * Analytics feature surface — Sprint H7.
 *
 * Session-only, privacy-safe product telemetry. Development/admin only:
 * nothing here is user-facing and nothing here is certification evidence.
 */
export {
  APP_VERSION,
  readSnapshot,
  recordFeedback,
  resetAnalytics,
  subscribe,
  trackEvent,
  type BetaStoreSnapshot,
  type TrackOptions,
} from "./analytics-store";
export { useAnalytics, useBetaSnapshot, useTrackOnce, type AnalyticsModel } from "./use-analytics";
