/**
 * RoomSyncCoordinator — Sprint 2.6, Foundation §15.
 *
 * The single authority for room-level synchronization decisions. Everything
 * the application wants to know about whether a room is *together enough* —
 * room health, per-participant status, readiness, countdown eligibility,
 * playback eligibility — is answered here and nowhere else.
 *
 * Engineering rule for the whole codebase (Sprint 2.6): no component, feature,
 * provider adapter, playback coordinator, or countdown runtime may compute
 * synchronization health, latency, drift, countdown eligibility, or playback
 * readiness for itself. `ClockSyncService` measures this device's clock; this
 * coordinator aggregates every device into one verdict. Two services, one
 * truth.
 *
 * Scope discipline, unchanged from Sprint 2.5: this coordinates readiness, it
 * does NOT synchronize playback. No player is touched, no position is
 * corrected, no provider is contacted. A verdict is information plus, for the
 * Re-sync Required band, a refusal to schedule.
 *
 * Aggregation rule: the room always reflects its weakest participant
 * (`aggregateHealth`, worst-first). One person 800ms out makes the room 800ms
 * out, regardless of how good everyone else looks.
 *
 * Realtime uses the existing foundation only: health is announced by
 * re-publishing the existing catalog event `DriftMeasured` through
 * `SyncService`, which the Sprint 1.9 realtime publisher already fans out. No
 * event is added, renamed, or re-versioned, and no schema changes.
 */
import { domainError } from "@/domain/errors/domain-errors";
import type { Clock } from "@/domain/events/event.types";
import { createServiceToken } from "@/domain/service-registry";
import type { Intent } from "@/domain/services/service-context";
import type { SyncService } from "@/domain/services/sync-service";

import type { ClockSyncService } from "./clock-sync-service";
import {
  aggregateHealth,
  classifyDrift,
  isHealthSatisfactory,
  requiresResync,
} from "./drift-engine";
import type { SyncHealth } from "./sync.types";

/**
 * What the room knows about one participant, as carried by presence.
 *
 * `clockOffsetMs` and `latencyMs` are the existing `room_presence` columns
 * (Database Spec §3.2) — no new schema, no new transport.
 */
export interface ParticipantSyncInput {
  readonly profileId: string;
  readonly isOnline: boolean;
  readonly clockOffsetMs: number | null;
  readonly latencyMs: number | null;
}

/** One participant's synchronization standing, as the room sees it. */
export interface ParticipantSyncStatus {
  readonly profileId: string;
  readonly health: SyncHealth;
  readonly clockOffsetMs: number | null;
  readonly latencyMs: number | null;
  readonly isOnline: boolean;
  /** In the Excellent or Good band; an unmeasured participant is not synced. */
  readonly isSynced: boolean;
}

/** Why a countdown is refused. Machine-readable; Presentation maps to copy. */
export type CountdownBlockReason = "resync_required" | "no_participants";

/**
 * The room's synchronization verdict at one instant. Immutable.
 *
 * Readiness is deliberately absent (Milestone D.5): who has confirmed is
 * `ReadyCoordinator`'s answer alone, and a second count here could disagree
 * with it. This coordinator answers timing questions and nothing else.
 */
export interface RoomSyncSnapshot {
  readonly roomId: string;
  readonly health: SyncHealth;
  readonly participants: readonly ParticipantSyncStatus[];
  readonly participantCount: number;
  readonly syncedCount: number;
  /** Whose clock the room's health came from, when one can be identified. */
  readonly weakestProfileId: string | null;
  /** Largest absolute measured offset across participants, or null. */
  readonly worstDeviationMs: number | null;
  /** Foundation §15 — false only in the Re-sync Required band. */
  readonly canStartCountdown: boolean;
  readonly blockReason: CountdownBlockReason | null;
  /** True in the Warning band: allowed, but the lobby says so. */
  readonly hasAdvisory: boolean;
  readonly observedAt: string;
}

export interface RoomSyncCoordinator {
  /** False when clock synchronization has no time source bound. */
  isAvailable(): boolean;
  /** Folds participants — plus this device's own estimate — into one verdict. */
  evaluate(roomId: string, participants: readonly ParticipantSyncInput[]): RoomSyncSnapshot;
  /** Foundation §15 gate. Throws `SF-SYNC-RESYNC-REQUIRED` when blocked. */
  assertCountdownEligible(snapshot: RoomSyncSnapshot): void;
  /** The only sanctioned answer to "may this room start a countdown?". */
  canStartCountdown(snapshot: RoomSyncSnapshot): boolean;
  /**
   * The only sanctioned answer to "may this room become ready to watch?".
   * Playback still starts in nobody's app: this is eligibility, not a launch.
   */
  isPlaybackEligible(snapshot: RoomSyncSnapshot): boolean;
  /** Fan-out over the existing realtime foundation. Host-driven, best effort. */
  publishRoomHealth(snapshot: RoomSyncSnapshot, intent: Intent): Promise<void>;
}

export interface RoomSyncCoordinatorDependencies {
  readonly clockSync: ClockSyncService;
  readonly sync: SyncService;
  readonly clock: Clock;
}

/** Presence carries an offset; the band it falls in is a §14.5 question. */
function healthOf(offsetMs: number | null): SyncHealth {
  return offsetMs === null ? "unknown" : classifyDrift(offsetMs);
}

export function createRoomSyncCoordinator(
  deps: RoomSyncCoordinatorDependencies,
): RoomSyncCoordinator {
  const { clockSync, sync, clock } = deps;

  const canStart = (snapshot: RoomSyncSnapshot): boolean =>
    !requiresResync(snapshot.health) && snapshot.participantCount > 0;

  return {
    isAvailable: () => clockSync.isAvailable(),

    evaluate(roomId, participants) {
      // This device's own estimate is fresher than the offset it last wrote to
      // presence, so it supersedes its own row rather than racing it.
      const own = clockSync.offsetFor(roomId);

      const statuses: ParticipantSyncStatus[] = participants.map((participant) => {
        const offsetMs = participant.clockOffsetMs;
        const health = healthOf(offsetMs);
        return Object.freeze({
          profileId: participant.profileId,
          health,
          clockOffsetMs: offsetMs,
          latencyMs: participant.latencyMs,
          isOnline: participant.isOnline,
          isSynced: isHealthSatisfactory(health),
        });
      });

      // Offline participants say nothing about the room's clock: a device that
      // is not there cannot be out of step with one that is.
      const measured = statuses.filter((status) => status.isOnline);
      const healths = measured.map((status) => status.health);
      const health = aggregateHealth(own ? [...healths, healthOf(own.offsetMs)] : healths);

      const deviations = measured
        .map((status) => status.clockOffsetMs)
        .filter((value): value is number => value !== null);
      const worstDeviationMs =
        deviations.length === 0
          ? (own?.offsetMs ?? null)
          : deviations.reduce((worst, value) =>
              Math.abs(value) > Math.abs(worst) ? value : worst,
            );

      const weakest = measured.reduce<ParticipantSyncStatus | null>((worst, status) => {
        if (status.clockOffsetMs === null) return worst;
        if (!worst || worst.clockOffsetMs === null) return status;
        return Math.abs(status.clockOffsetMs) > Math.abs(worst.clockOffsetMs) ? status : worst;
      }, null);

      const syncedCount = measured.filter((status) => status.isSynced).length;

      const snapshot: RoomSyncSnapshot = Object.freeze({
        roomId,
        health,
        participants: Object.freeze(statuses),
        participantCount: statuses.length,
        syncedCount,
        weakestProfileId: weakest?.profileId ?? null,
        worstDeviationMs,
        canStartCountdown: false,
        blockReason: null,
        hasAdvisory: health === "warning",
        observedAt: clock.now().toISOString(),
      });

      const eligible = canStart(snapshot);
      return Object.freeze({
        ...snapshot,
        canStartCountdown: eligible,
        blockReason: eligible
          ? null
          : requiresResync(health)
            ? ("resync_required" as CountdownBlockReason)
            : ("no_participants" as CountdownBlockReason),
      });
    },

    canStartCountdown: canStart,

    assertCountdownEligible(snapshot) {
      if (requiresResync(snapshot.health)) {
        // Foundation §15 — the one place the room is refused a countdown. The
        // thresholds themselves are read by SyncService, never restated here.
        sync.assertSchedulable(snapshot.worstDeviationMs ?? 0, snapshot.roomId);
        // Defensive: an unmeasured room cannot reach this branch, but a future
        // band change must never silently open the gate.
        throw domainError("SYNC_RESYNC_REQUIRED", {
          operation: "RoomSyncCoordinator.assertCountdownEligible",
          aggregateId: snapshot.roomId,
        });
      }
      if (snapshot.participantCount === 0) {
        throw domainError("INVALID_INPUT", {
          operation: "RoomSyncCoordinator.assertCountdownEligible",
          aggregateId: snapshot.roomId,
        });
      }
    },

    isPlaybackEligible(snapshot) {
      return !requiresResync(snapshot.health) && snapshot.participantCount > 0;
    },

    async publishRoomHealth(snapshot, intent) {
      if (snapshot.worstDeviationMs === null || !intent.actorProfileId) return;
      // Existing catalog event, existing realtime publisher: the room learns
      // the weakest measured deviation and classifies it identically.
      await sync.measureDrift(
        {
          roomId: snapshot.roomId,
          profileId: snapshot.weakestProfileId ?? intent.actorProfileId,
          driftMs: snapshot.worstDeviationMs,
        },
        intent,
      );
    },
  };
}

export function resolveRoomSyncCoordinatorDependencies(input: {
  readonly clockSync: ClockSyncService;
  readonly sync: SyncService;
  readonly clock: Clock;
}): RoomSyncCoordinatorDependencies {
  return input;
}

export const ROOM_SYNC_COORDINATOR = createServiceToken<RoomSyncCoordinator>("RoomSyncCoordinator");
