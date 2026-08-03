/**
 * PlaybackSyncEngine — Sprint 2.7, Foundation §14.5 and §15.
 *
 * The third and final member of StreamFlow's synchronization pipeline:
 *
 *   ClockSyncService     — what time is it, really? (this device)
 *   RoomSyncCoordinator  — is the room together enough? (all devices)
 *   PlaybackSyncEngine   — where should playback be, and who is off? (this file)
 *
 * Engineering rule for the whole codebase: no other module may compute
 * playback timing, drift, synchronization health, playback readiness, or
 * correction policy. Presentation renders these verdicts; it never derives one.
 *
 * Scope discipline. This sprint decides HOW playback state is synchronized and
 * still controls nothing. There is no provider SDK, no player handle, no deep
 * link, no browser action, and no correction: a `PlaybackCorrection` says a
 * correction *would be* eligible and is permanently `applied: false`. Every
 * participant presses play in their own app (MVP §6, ADR-003).
 *
 * Composition:
 *  - the anchor comes from the durable runtime `PlaybackCoordinator` persists,
 *  - "now" comes from `ClockSyncService.serverNowMs` — never `Date.now()`,
 *  - the room's clock verdict comes from `RoomSyncCoordinator`,
 *  - the bands and correction classes come from `playback-drift-policy`.
 *
 * Realtime uses the existing foundation only: a room that reaches
 * `require_resync` re-publishes the existing catalog event `ResyncRequested`
 * through `SyncService`, which the Sprint 1.9 publisher already fans out. No
 * event is added, renamed, or re-versioned, and no schema changes.
 */
import type { Clock } from "@/domain/events/event.types";
import { createServiceToken } from "@/domain/service-registry";
import type { Intent } from "@/domain/services/service-context";
import type { SyncService } from "@/domain/services/sync-service";
import type { ClockSyncService } from "@/domain/sync/clock-sync-service";
import type {
  RoomSyncCoordinator,
  RoomSyncSnapshot,
} from "@/domain/sync/room-sync-coordinator";
import { isHealthSatisfactory, requiresResync } from "@/domain/sync/drift-engine";

import {
  correctionFor,
  deltaFor,
  isPlaybackInSync,
  positionFromAnchor,
  worstDelta,
} from "./playback-drift-policy";
import type { PlaybackRuntime } from "./playback-runtime";
import {
  createPlaybackAnchor,
  type ParticipantPlaybackReport,
  type PlaybackAnchor,
  type PlaybackCorrection,
  type PlaybackDelta,
  type PlaybackHealth,
  type PlaybackPosition,
  type PlaybackSyncDecision,
  type PlaybackSyncSnapshot,
} from "./playback-sync.types";
import { isPlaybackActive } from "./playback-machine";

/** Everything the engine needs to reach a verdict for one room. */
export interface PlaybackSyncInput {
  readonly roomId: string;
  /** The durable playback facts, as read by `PlaybackCoordinator`. */
  readonly runtime: PlaybackRuntime | null;
  /** The room's clock verdict. Playback can never be readier than this. */
  readonly roomSync: RoomSyncSnapshot | null;
  /** Self-reported positions, when participants have any to report. */
  readonly reports: readonly ParticipantPlaybackReport[];
  /** True while the room recently returned from Re-sync Required. */
  readonly isRecovering?: boolean;
}

export interface PlaybackSyncEngine {
  /** False when clock synchronization has no time source bound. */
  isAvailable(): boolean;
  /** The room's reference point, or null before a session exists. */
  anchorOf(runtime: PlaybackRuntime | null): PlaybackAnchor | null;
  /** Authoritative position at server-corrected now. The only such answer. */
  positionOf(anchor: PlaybackAnchor, roomId: string): PlaybackPosition;
  /** One participant's distance from the authoritative position. */
  deltaOf(report: ParticipantPlaybackReport, authoritativePositionMs: number): PlaybackDelta;
  /** The correction class a delta justifies. Never performs one. */
  correctionOf(delta: PlaybackDelta | null, authoritativePositionMs: number): PlaybackCorrection;
  /** Folds runtime, room health, and reports into one immutable verdict. */
  evaluate(input: PlaybackSyncInput): PlaybackSyncSnapshot;
  /** The only sanctioned answer to "is this room ready to watch together?". */
  isPlaybackReady(snapshot: PlaybackSyncSnapshot): boolean;
  /** Fan-out over the existing realtime foundation. Host-driven, best effort. */
  publishSyncState(snapshot: PlaybackSyncSnapshot, intent: Intent): Promise<void>;
}

export interface PlaybackSyncEngineDependencies {
  readonly clockSync: ClockSyncService;
  readonly roomSync: RoomSyncCoordinator;
  readonly sync: SyncService;
  readonly clock: Clock;
}

export function createPlaybackSyncEngine(
  deps: PlaybackSyncEngineDependencies,
): PlaybackSyncEngine {
  const { clockSync, roomSync, sync, clock } = deps;

  const anchorOf = (runtime: PlaybackRuntime | null): PlaybackAnchor | null => {
    if (!runtime || runtime.sessionId === null) return null;
    // An un-anchored runtime still has a reference point: position zero at the
    // instant it was armed. The anchor simply is not advancing yet.
    const anchorMs = runtime.anchorAt === null ? NaN : Date.parse(runtime.anchorAt);
    return createPlaybackAnchor({
      roomId: runtime.roomId,
      positionMs: runtime.positionMs,
      serverInstantMs: Number.isFinite(anchorMs)
        ? anchorMs
        : clockSync.serverNowMs(runtime.roomId),
      anchorAt: runtime.anchorAt,
      isAdvancing: runtime.state === "playing",
      durationMs: runtime.durationMs,
      revision: runtime.revision,
    });
  };

  const positionOf = (anchor: PlaybackAnchor, roomId: string): PlaybackPosition =>
    positionFromAnchor(anchor, clockSync.serverNowMs(roomId));

  /**
   * The decision table, in one place and in priority order. Clock health wins
   * over playback health: a room whose clocks disagree cannot make a credible
   * statement about media positions in the first place.
   */
  const decide = (input: {
    readonly clockHealth: PlaybackHealth;
    readonly playbackHealth: PlaybackHealth;
    readonly isArmed: boolean;
    readonly hasMeasurements: boolean;
    readonly isRecovering: boolean;
  }): PlaybackSyncDecision => {
    if (requiresResync(input.clockHealth) || requiresResync(input.playbackHealth)) {
      return "require_resync";
    }
    if (input.isRecovering) return "recovering";
    if (!input.isArmed) return "waiting";
    if (!input.hasMeasurements) {
      // Armed with nothing to compare is the MVP's normal state: manual-sync
      // rooms report no position at all. Honest silence, not a false verdict.
      return isHealthSatisfactory(input.clockHealth) ? "stay_synchronized" : "waiting";
    }
    if (input.playbackHealth === "warning") return "recommend_resync";
    return isPlaybackInSync(input.playbackHealth) ? "stay_synchronized" : "waiting";
  };

  return {
    isAvailable: () => clockSync.isAvailable(),
    anchorOf,
    positionOf,
    deltaOf: deltaFor,
    correctionOf: correctionFor,

    evaluate(input) {
      const observedAt = clock.now().toISOString();
      const anchor = anchorOf(input.runtime);
      const position = anchor ? positionOf(anchor, input.roomId) : null;
      const authoritativePositionMs = position?.positionMs ?? 0;

      const deltas = input.reports.map((report) => deltaFor(report, authoritativePositionMs));
      const measured = deltas.filter((delta) => delta.isMeasured);
      const worst = worstDelta(deltas);

      const clockHealth: PlaybackHealth = input.roomSync?.health ?? "unknown";
      // With nothing measured, playback health is the room's clock health:
      // claiming a band from zero observations would be an invention.
      const playbackHealth: PlaybackHealth =
        measured.length === 0 ? clockHealth : (worst?.health ?? clockHealth);

      const isArmed = input.runtime !== null && isPlaybackActive(input.runtime.state);
      const decision = decide({
        clockHealth,
        playbackHealth,
        isArmed,
        hasMeasurements: measured.length > 0,
        isRecovering: input.isRecovering ?? false,
      });

      const isSynchronizationReady =
        isHealthSatisfactory(clockHealth) &&
        (input.roomSync ? roomSync.isPlaybackEligible(input.roomSync) : false);

      return Object.freeze({
        roomId: input.roomId,
        decision,
        health: playbackHealth,
        anchor,
        position,
        deltas: Object.freeze(deltas),
        correction: correctionFor(worst, authoritativePositionMs),
        inSyncCount: measured.filter((delta) => isPlaybackInSync(delta.health)).length,
        outOfSyncCount: measured.filter((delta) => !isPlaybackInSync(delta.health)).length,
        unmeasuredCount: deltas.length - measured.length,
        participantCount: deltas.length,
        isPlaybackReady: isArmed && isSynchronizationReady && decision !== "require_resync",
        isSynchronizationReady,
        // The MVP's steady state: armed, together, and waiting for humans.
        isWaitingForManualPlay:
          isArmed &&
          isSynchronizationReady &&
          decision === "stay_synchronized" &&
          !(position?.isAdvancing ?? false),
        isWaitingForResync: decision === "require_resync",
        observedAt,
      });
    },

    isPlaybackReady: (snapshot) => snapshot.isPlaybackReady,

    async publishSyncState(snapshot, intent) {
      if (!intent.actorProfileId) return;
      if (snapshot.decision !== "require_resync") return;
      // Existing catalog event, existing publisher. A re-sync request is a
      // request to *people*, not a command to a player.
      await sync.requestResync(
        {
          roomId: snapshot.roomId,
          requestedByProfileId: intent.actorProfileId,
          driftMs: snapshot.correction.deltaMs,
        },
        intent,
      );
    },
  };
}

export function resolvePlaybackSyncEngineDependencies(input: {
  readonly clockSync: ClockSyncService;
  readonly roomSync: RoomSyncCoordinator;
  readonly sync: SyncService;
  readonly clock: Clock;
}): PlaybackSyncEngineDependencies {
  return input;
}

export const PLAYBACK_SYNC_ENGINE = createServiceToken<PlaybackSyncEngine>("PlaybackSyncEngine");
