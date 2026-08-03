/**
 * ClockSyncService — Sprint 2.5, Foundation §15.
 *
 * Establishes a common notion of time across clients, and stops there. It
 * does not synchronize playback, does not correct drift, does not move a
 * countdown, and never contacts a provider.
 *
 * Responsibilities, all delegated to pure engines so this file stays about
 * orchestration:
 *  - burst sampling through the `ServerTimeSource` port,
 *  - a rolling window with outlier rejection (`clock-sync-engine`),
 *  - median offset plus a confidence score,
 *  - drift classification into the four Foundation §14.5 bands (`drift-engine`).
 *
 * Event Bus usage is strictly existing catalog names, published through the
 * Sprint 1.6 `SyncService`: `ClockOffsetUpdated` and `DriftMeasured`. No event
 * is added, renamed, or re-versioned, and no new event infrastructure appears.
 *
 * State is per-room and in memory by design: a clock estimate describes *this*
 * device on *this* connection, so persisting it would be meaningless to anyone
 * else. The durable, shareable summary already has a home — `clock_offset_ms`
 * on the presence heartbeat (Foundation §15, Database Spec §3.2).
 */
import { domainError } from "@/domain/errors/domain-errors";
import type { Clock } from "@/domain/events/event.types";
import { createServiceToken, isServiceBound, resolveService } from "@/domain/service-registry";
import type { Intent } from "@/domain/services/service-context";
import type { SyncService } from "@/domain/services/sync-service";
import { SYNC_RUNTIME } from "@/shared/constants/system-constants";

import {
  estimateClockOffset,
  rejectOutliers,
  rollWindow,
  summarize,
  toLatencySample,
} from "./clock-sync-engine";
import { classifyDrift, healthFromOffset } from "./drift-engine";
import { SERVER_TIME_SOURCE, type ServerTimeSource } from "./server-time-source";
import {
  EMPTY_SYNC_STATISTICS,
  type ClockOffset,
  type LatencySample,
  type SyncHealth,
  type SyncSnapshot,
} from "./sync.types";

export interface ClockSyncRequest {
  readonly roomId: string;
  readonly profileId: string | null;
}

export interface ClockSyncService {
  /** False when no time source is bound; the lobby then reports `unknown`. */
  isAvailable(): boolean;
  /**
   * Takes a burst of probes (join, reconnect, before scheduling) and folds
   * them into the room's rolling window. Returns the resulting snapshot.
   * A probe that fails is skipped, not fatal: a burst of four good samples is
   * a perfectly usable measurement.
   */
  measure(request: ClockSyncRequest, size?: number): Promise<SyncSnapshot>;
  /** The current snapshot without taking new measurements. Pure read. */
  snapshot(request: ClockSyncRequest): SyncSnapshot;
  /** Working offset for a room, or null before the first successful burst. */
  offsetFor(roomId: string): ClockOffset | null;
  /**
   * Server-corrected time for this device. The only sanctioned way to ask
   * "what time is it?" once a room is open — never `Date.now()` directly.
   */
  serverNowMs(roomId: string): number;
  /** Publishes `ClockOffsetUpdated` for the room's current estimate. */
  publishOffset(request: ClockSyncRequest, intent: Intent): Promise<void>;
  /** Publishes `DriftMeasured` for an observed deviation. Classification only. */
  publishDrift(request: ClockSyncRequest, deviationMs: number, intent: Intent): Promise<void>;
  /** Forgets a room's window, e.g. on leave. */
  forget(roomId: string): void;
}

export interface ClockSyncServiceDependencies {
  readonly timeSource: ServerTimeSource | null;
  readonly sync: SyncService;
  readonly clock: Clock;
}

export function createClockSyncService(deps: ClockSyncServiceDependencies): ClockSyncService {
  const { timeSource, sync, clock } = deps;
  const windows = new Map<string, readonly LatencySample[]>();

  const available = (): boolean => timeSource !== null && timeSource.isAvailable();

  const offsetFor = (roomId: string): ClockOffset | null => {
    const samples = windows.get(roomId);
    if (!samples || samples.length === 0) return null;
    return estimateClockOffset(samples, clock.now().toISOString());
  };

  const snapshotOf = (request: ClockSyncRequest): SyncSnapshot => {
    const samples = windows.get(request.roomId) ?? [];
    const offset = offsetFor(request.roomId);
    const health: SyncHealth = available() ? healthFromOffset(offset) : "unknown";

    return Object.freeze({
      roomId: request.roomId,
      profileId: request.profileId,
      offset,
      deviationMs: offset ? offset.offsetMs : null,
      health,
      statistics: samples.length > 0 ? summarize(rejectOutliers(samples)) : EMPTY_SYNC_STATISTICS,
      observedAt: clock.now().toISOString(),
    });
  };

  return {
    isAvailable: available,
    offsetFor,
    snapshot: snapshotOf,

    async measure(request, size = SYNC_RUNTIME.BURST_SIZE) {
      if (!timeSource || !timeSource.isAvailable()) {
        // Not an error: an unconfigured backend simply means unknown health.
        return snapshotOf(request);
      }

      const fresh: LatencySample[] = [];
      for (let index = 0; index < size; index += 1) {
        try {
          const probe = await timeSource.probe();
          fresh.push(toLatencySample(probe, clock.now().toISOString()));
        } catch {
          // A single failed probe is normal on a flaky link. The burst
          // continues; confidence falls on its own if too few survive.
        }
        if (index < size - 1) {
          await new Promise((resolve) => setTimeout(resolve, SYNC_RUNTIME.BURST_SPACING_MS));
        }
      }

      if (fresh.length > 0) {
        windows.set(request.roomId, rollWindow(windows.get(request.roomId) ?? [], fresh));
      }
      return snapshotOf(request);
    },

    serverNowMs(roomId) {
      const offset = offsetFor(roomId);
      return clock.now().getTime() + (offset?.offsetMs ?? 0);
    },

    async publishOffset(request, intent) {
      const offset = offsetFor(request.roomId);
      if (!offset || !request.profileId) return;
      await sync.recordClockOffset(
        {
          roomId: request.roomId,
          profileId: request.profileId,
          clockOffsetMs: offset.offsetMs,
          sampleCount: offset.acceptedCount,
        },
        intent,
      );
    },

    async publishDrift(request, deviationMs, intent) {
      if (!request.profileId) {
        throw domainError("INVALID_INPUT", { operation: "ClockSyncService.publishDrift" });
      }
      // Classification only — publishing a band never triggers a correction.
      void classifyDrift(deviationMs);
      await sync.measureDrift(
        { roomId: request.roomId, profileId: request.profileId, driftMs: deviationMs },
        intent,
      );
    },

    forget(roomId) {
      windows.delete(roomId);
    },
  };
}

export function resolveClockSyncDependencies(input: {
  readonly sync: SyncService;
  readonly clock: Clock;
}): ClockSyncServiceDependencies {
  return {
    timeSource: isServiceBound(SERVER_TIME_SOURCE) ? resolveService(SERVER_TIME_SOURCE) : null,
    ...input,
  };
}

export const CLOCK_SYNC_SERVICE = createServiceToken<ClockSyncService>("ClockSyncService");
