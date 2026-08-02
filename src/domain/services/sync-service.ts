/**
 * SyncService — Foundation §3, §15, Sprint 1.6.
 *
 * Clock-offset estimation, drift classification and re-sync decisions. Bands
 * are read from Foundation §14.5 through the shared constants module; the
 * service never measures time against device clocks directly.
 */
import { domainError } from "@/domain/errors/domain-errors";
import type { CatalogEvent } from "@/domain/events/event-bus";
import {
  SYNC_QUALITY_BANDS,
  type SyncQualityBand,
} from "@/shared/constants/system-constants";

import type { DomainServiceContext, Intent } from "./service-context";

export interface ClockSample {
  /** Round-trip measurement in milliseconds. */
  readonly roundTripMs: number;
  /** Server minus client, corrected for half the round trip. */
  readonly offsetMs: number;
}

export interface SyncService {
  /** Foundation §14.5 band classification; the only place the thresholds are read. */
  classify(deviationMs: number): SyncQualityBand;
  /** Median-of-samples estimate: resistant to a single bad round trip. */
  estimateOffset(samples: readonly ClockSample[]): number;
  recordClockOffset(
    input: { roomId: string; profileId: string; clockOffsetMs: number; sampleCount: number },
    intent: Intent,
  ): Promise<CatalogEvent<"ClockOffsetUpdated">>;
  measureDrift(
    input: { roomId: string; profileId: string; driftMs: number },
    intent: Intent,
  ): Promise<CatalogEvent<"DriftMeasured">>;
  requestResync(
    input: { roomId: string; requestedByProfileId: string; driftMs: number },
    intent: Intent,
  ): Promise<CatalogEvent<"ResyncRequested">>;
  applyResync(
    input: { roomId: string; positionMs: number },
    intent: Intent,
  ): Promise<CatalogEvent<"ResyncApplied">>;
  /** Foundation §15: scheduling is blocked in the `resync_required` band. */
  assertSchedulable(deviationMs: number, roomId: string): void;
}

export function createSyncService(context: DomainServiceContext): SyncService {
  const { events, clock } = context;

  const classify = (deviationMs: number): SyncQualityBand => {
    const magnitude = Math.abs(deviationMs);
    if (magnitude <= SYNC_QUALITY_BANDS.EXCELLENT_MAX_MS) return "excellent";
    if (magnitude <= SYNC_QUALITY_BANDS.GOOD_MAX_MS) return "good";
    if (magnitude <= SYNC_QUALITY_BANDS.WARNING_MAX_MS) return "warning";
    return "resync_required";
  };

  return {
    classify,

    estimateOffset(samples) {
      if (samples.length === 0) {
        throw domainError("INVALID_INPUT", { operation: "SyncService.estimateOffset" });
      }
      const ordered = [...samples].sort((a, b) => a.roundTripMs - b.roundTripMs);
      const offsets = ordered.map((sample) => sample.offsetMs).sort((a, b) => a - b);
      const middle = Math.floor(offsets.length / 2);
      return offsets.length % 2 === 0
        ? Math.round((offsets[middle - 1]! + offsets[middle]!) / 2)
        : offsets[middle]!;
    },

    assertSchedulable(deviationMs, roomId) {
      if (classify(deviationMs) === "resync_required") {
        throw domainError("SYNC_RESYNC_REQUIRED", {
          operation: "SyncService.assertSchedulable",
          aggregateId: roomId,
        });
      }
    },

    recordClockOffset: (input, intent) =>
      events.publish(
        "ClockOffsetUpdated",
        input.roomId,
        { ...input, qualityBand: classify(input.clockOffsetMs) },
        intent,
      ),

    measureDrift: (input, intent) =>
      events.publish(
        "DriftMeasured",
        input.roomId,
        { ...input, qualityBand: classify(input.driftMs) },
        intent,
      ),

    requestResync: (input, intent) =>
      events.publish("ResyncRequested", input.roomId, { ...input }, intent),

    applyResync: (input, intent) =>
      events.publish(
        "ResyncApplied",
        input.roomId,
        { ...input, anchorServerTime: clock.now().toISOString() },
        intent,
      ),
  };
}
