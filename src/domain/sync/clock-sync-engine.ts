/**
 * Clock synchronization engine — Sprint 2.5, Foundation §15.
 *
 * Pure functions only: no clock is read here, no request is made, no state is
 * held. Feed it probes, get back samples, an offset, and statistics. That
 * purity is what makes the rules testable and portable — the same code runs
 * unchanged under Cursor, Claude Code, or plain `vite dev`.
 *
 * The three rules Foundation §15 fixes, and where they live:
 *  1. offset halves the round-trip delay        -> `toLatencySample`
 *  2. anomalous round trips are rejected        -> `rejectOutliers`
 *  3. the working offset is a median, not a mean -> `estimateClockOffset`
 */
import { SYNC_RUNTIME } from "@/shared/constants/system-constants";

import {
  EMPTY_SYNC_STATISTICS,
  type ClockOffset,
  type LatencySample,
  type ServerTimeProbe,
  type SyncStatistics,
} from "./sync.types";

/** Median of a numeric list. Returns 0 for an empty list. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1]! + ordered[middle]!) / 2
    : ordered[middle]!;
}

/**
 * Median absolute deviation — the robust cousin of standard deviation. One
 * catastrophic round trip cannot inflate it, which is precisely why outlier
 * rejection is built on it rather than on a mean and sigma.
 */
export function medianAbsoluteDeviation(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const centre = median(values);
  return median(values.map((value) => Math.abs(value - centre)));
}

/**
 * Turns one probe into a sample.
 *
 * `roundTrip = received - sent`, and the server instant is assumed to sit at
 * the midpoint of that interval, so `offset = serverTime + roundTrip/2 - received`.
 * A negative offset means the client clock runs ahead of the server.
 */
export function toLatencySample(probe: ServerTimeProbe, observedAt: string): LatencySample {
  const roundTripMs = Math.max(0, probe.clientReceivedMs - probe.clientSentMs);
  const offsetMs = Math.round(probe.serverTimeMs + roundTripMs / 2 - probe.clientReceivedMs);
  return Object.freeze({
    roundTripMs,
    offsetMs,
    observedAt,
    // Rejection is a window-level verdict; a lone sample cannot be an outlier.
    rejected: false,
  });
}

/**
 * Marks samples whose round trip is anomalous relative to the recent median.
 *
 * A sample is rejected when it lies more than `OUTLIER_MAD_FACTOR` median
 * absolute deviations above the median round trip. When the link is perfectly
 * steady (MAD of zero) the fallback is a multiple of the median, so an
 * identical set of fast samples is never rejected wholesale.
 *
 * Rejection is one-sided on purpose: an unusually *fast* round trip is the
 * best measurement in the window, not a fault.
 */
export function rejectOutliers(samples: readonly LatencySample[]): readonly LatencySample[] {
  if (samples.length < SYNC_RUNTIME.MIN_SAMPLES_FOR_REJECTION) {
    return samples.map((sample) => Object.freeze({ ...sample, rejected: false }));
  }

  const roundTrips = samples.map((sample) => sample.roundTripMs);
  const centre = median(roundTrips);
  const deviation = medianAbsoluteDeviation(roundTrips);
  const ceiling =
    deviation > 0
      ? centre + SYNC_RUNTIME.OUTLIER_MAD_FACTOR * deviation
      : centre * SYNC_RUNTIME.OUTLIER_FLAT_FACTOR;

  const marked = samples.map((sample) =>
    Object.freeze({ ...sample, rejected: sample.roundTripMs > ceiling }),
  );

  // Never reject everything: an estimate from noisy data beats no estimate,
  // and the confidence score already tells the caller how much to trust it.
  return marked.some((sample) => !sample.rejected)
    ? marked
    : samples.map((sample) => Object.freeze({ ...sample, rejected: false }));
}

/** Keeps the newest `WINDOW_SIZE` samples — the rolling average's memory. */
export function rollWindow(
  existing: readonly LatencySample[],
  incoming: readonly LatencySample[],
): readonly LatencySample[] {
  const merged = [...existing, ...incoming];
  return merged.length <= SYNC_RUNTIME.WINDOW_SIZE
    ? merged
    : merged.slice(merged.length - SYNC_RUNTIME.WINDOW_SIZE);
}

/**
 * Confidence in the working offset, from 0 to 1.
 *
 * Three things make an estimate trustworthy, and each is a factor here:
 *  - enough retained samples (coverage),
 *  - a steady link (low jitter relative to the round trip),
 *  - samples that agree with one another (a narrow offset spread).
 *
 * It is a description of the measurement, never a claim about playback.
 */
export function scoreConfidence(statistics: SyncStatistics): number {
  if (statistics.acceptedCount === 0) return 0;

  const coverage = Math.min(1, statistics.acceptedCount / SYNC_RUNTIME.WINDOW_SIZE);
  const steadiness =
    statistics.medianRoundTripMs > 0
      ? 1 - Math.min(1, statistics.jitterMs / statistics.medianRoundTripMs)
      : 1;
  const agreement = 1 - Math.min(1, statistics.offsetSpreadMs / SYNC_RUNTIME.SPREAD_CEILING_MS);

  const score = coverage * 0.4 + steadiness * 0.3 + agreement * 0.3;
  return Math.round(Math.max(0, Math.min(1, score)) * 100) / 100;
}

/** Descriptive statistics over a window. Pure; safe to call on every render. */
export function summarize(samples: readonly LatencySample[]): SyncStatistics {
  if (samples.length === 0) return EMPTY_SYNC_STATISTICS;

  const accepted = samples.filter((sample) => !sample.rejected);
  const roundTrips = samples.map((sample) => sample.roundTripMs);
  const acceptedOffsets = accepted.map((sample) => sample.offsetMs);

  return Object.freeze({
    sampleCount: samples.length,
    acceptedCount: accepted.length,
    rejectedCount: samples.length - accepted.length,
    minRoundTripMs: Math.min(...roundTrips),
    medianRoundTripMs: Math.round(median(roundTrips)),
    maxRoundTripMs: Math.max(...roundTrips),
    jitterMs: Math.round(medianAbsoluteDeviation(roundTrips)),
    offsetSpreadMs:
      acceptedOffsets.length > 1
        ? Math.round(Math.max(...acceptedOffsets) - Math.min(...acceptedOffsets))
        : 0,
  });
}

/**
 * The working offset for a window: reject outliers, take the median of what
 * survives, and describe how much that median is worth.
 */
export function estimateClockOffset(
  samples: readonly LatencySample[],
  measuredAt: string,
): ClockOffset | null {
  if (samples.length === 0) return null;

  const marked = rejectOutliers(samples);
  const accepted = marked.filter((sample) => !sample.rejected);
  const statistics = summarize(marked);

  return Object.freeze({
    offsetMs: Math.round(median(accepted.map((sample) => sample.offsetMs))),
    latencyMs: Math.round(median(accepted.map((sample) => sample.roundTripMs)) / 2),
    sampleCount: marked.length,
    acceptedCount: accepted.length,
    confidence: scoreConfidence(statistics),
    measuredAt,
  });
}
