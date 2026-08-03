/**
 * Synchronization domain module — Sprint 2.5.
 *
 * Clock synchronization and drift classification. No playback synchronization,
 * no correction, no provider contact.
 */
export type {
  ClockOffset,
  LatencySample,
  ServerTimeProbe,
  SyncHealth,
  SyncSnapshot,
  SyncStatistics,
} from "./sync.types";
export { EMPTY_SYNC_STATISTICS } from "./sync.types";
export {
  estimateClockOffset,
  median,
  medianAbsoluteDeviation,
  rejectOutliers,
  rollWindow,
  scoreConfidence,
  summarize,
  toLatencySample,
} from "./clock-sync-engine";
export {
  aggregateHealth,
  classifyDrift,
  crossesHealthCategory,
  healthFromOffset,
  isHealthSatisfactory,
  measureDrift,
  requiresResync,
} from "./drift-engine";
export { SERVER_TIME_SOURCE, type ServerTimeSource } from "./server-time-source";
export {
  createClockSyncService,
  resolveClockSyncDependencies,
  CLOCK_SYNC_SERVICE,
  type ClockSyncRequest,
  type ClockSyncService,
  type ClockSyncServiceDependencies,
} from "./clock-sync-service";
