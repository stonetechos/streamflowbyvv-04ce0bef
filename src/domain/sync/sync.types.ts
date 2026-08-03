/**
 * Synchronization domain models — Sprint 2.5.
 *
 * Immutable, vendor-free descriptions of "what time is it, really?" as seen
 * from one client. Nothing here measures, decides, or corrects: the engines
 * (`clock-sync-engine`, `drift-engine`) compute these shapes, and
 * `ClockSyncService` orchestrates them.
 *
 * Scope discipline (Foundation §15): this module establishes a *common notion
 * of time*. It never advances, rewinds, or nudges playback, and it never
 * contacts a provider. Classification only.
 */
import type { SyncQualityBand } from "@/shared/constants/system-constants";

/** ISO-8601 UTC, matching the convention used across the room aggregate. */
export type IsoTimestamp = string;

/**
 * One raw round-trip exchange with the server.
 *
 * Foundation §15: the client records its send time, the server's time, and its
 * own receive time; the offset halves the round-trip delay. A sample keeps its
 * `rejected` verdict rather than being discarded, so statistics can report how
 * noisy the link is instead of quietly hiding it.
 */
export interface LatencySample {
  /** Full round-trip delay in milliseconds. */
  readonly roundTripMs: number;
  /** Server minus client, corrected for half the round trip. */
  readonly offsetMs: number;
  readonly observedAt: IsoTimestamp;
  /** True when outlier rejection excluded this sample from the estimate. */
  readonly rejected: boolean;
}

/** The working offset derived from the retained samples. */
export interface ClockOffset {
  /** Median of retained sample offsets — never the mean (Foundation §15). */
  readonly offsetMs: number;
  /** Median one-way latency, i.e. half the median round trip. */
  readonly latencyMs: number;
  /** Samples considered (accepted plus rejected). */
  readonly sampleCount: number;
  /** Samples that survived outlier rejection and formed the estimate. */
  readonly acceptedCount: number;
  /** 0 (worthless) to 1 (a full, quiet window). Never a promise of accuracy. */
  readonly confidence: number;
  readonly measuredAt: IsoTimestamp;
}

/** Descriptive statistics over the retained window. Diagnostics, not decisions. */
export interface SyncStatistics {
  readonly sampleCount: number;
  readonly acceptedCount: number;
  readonly rejectedCount: number;
  readonly minRoundTripMs: number;
  readonly medianRoundTripMs: number;
  readonly maxRoundTripMs: number;
  /** Median absolute deviation of the round trip: how unsteady the link is. */
  readonly jitterMs: number;
  /** Spread of accepted offsets; a wide spread means a soft estimate. */
  readonly offsetSpreadMs: number;
}

/**
 * Health as the lobby reports it. The four bands come from Foundation §14.5;
 * `unknown` is the honest answer before the first burst completes, and is
 * never presented as a band.
 */
export type SyncHealth = SyncQualityBand | "unknown";

/** Everything one client knows about its own clock at one instant. */
export interface SyncSnapshot {
  readonly roomId: string;
  readonly profileId: string | null;
  /** Null until a burst has produced an estimate. */
  readonly offset: ClockOffset | null;
  /** Absolute deviation the health band was derived from. */
  readonly deviationMs: number | null;
  readonly health: SyncHealth;
  readonly statistics: SyncStatistics;
  readonly observedAt: IsoTimestamp;
}

/** One round-trip measurement as taken by a `ServerTimeSource`. */
export interface ServerTimeProbe {
  /** Client clock when the request left, in epoch milliseconds. */
  readonly clientSentMs: number;
  /** Server clock as reported, in epoch milliseconds. */
  readonly serverTimeMs: number;
  /** Client clock when the response arrived, in epoch milliseconds. */
  readonly clientReceivedMs: number;
}

export const EMPTY_SYNC_STATISTICS: SyncStatistics = Object.freeze({
  sampleCount: 0,
  acceptedCount: 0,
  rejectedCount: 0,
  minRoundTripMs: 0,
  medianRoundTripMs: 0,
  maxRoundTripMs: 0,
  jitterMs: 0,
  offsetSpreadMs: 0,
});
