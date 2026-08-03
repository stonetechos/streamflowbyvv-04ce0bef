/**
 * ReadyCoordinator — Sprint 2.9.
 *
 * The single authority for readiness in a room. Everything the application
 * wants to know about who has confirmed, who is still being waited for, when a
 * confirmation has gone stale, whether the countdown may be offered, and what
 * the host should be told, is answered here and nowhere else.
 *
 * Engineering rule (Sprint 2.9): no component, hook, panel, or coordinator may
 * count ready members, decide "everyone is ready", decide countdown
 * availability, or decide when the manual-play reminder is due for itself.
 * `RoomSyncCoordinator` remains the authority for synchronization; this
 * coordinator consults it and never re-derives a band.
 *
 * Scope discipline: readiness is a social signal, not a playback decision. This
 * module starts nothing, launches nothing, contacts no provider, and touches no
 * player. StreamFlow cannot observe whether a member pressed play — so the
 * final step of the workflow is always a reminder, never an assertion.
 */
import type { Clock } from "@/domain/events/event.types";
import { createServiceToken } from "@/domain/service-registry";
import type { RoomSyncCoordinator, RoomSyncSnapshot } from "@/domain/sync/room-sync-coordinator";
import { READY_CONFIRMATION } from "@/shared/constants/system-constants";

/** What the lobby knows about one joined member's confirmation. */
export interface ReadyParticipantInput {
  readonly profileId: string;
  /** Joined members only; an invitee has nobody to wait for. */
  readonly isJoined: boolean;
  readonly isOnline: boolean;
  readonly isReady: boolean;
  /**
   * Epoch millis since this member has been joined-but-unconfirmed, as first
   * observed by the caller. Null while unknown; a null never times out.
   */
  readonly waitingSinceMs: number | null;
}

/** Where a single viewer stands in the confirmation workflow. */
export type ViewerReadyState =
  | "not_member"
  | "not_ready"
  | "launch_pending"
  | "waiting_for_others"
  | "everyone_ready";

/** Why the countdown cannot be offered yet. Presentation maps to copy. */
export type ReadyBlockReason =
  | "no_participants"
  | "no_provider"
  | "not_everyone_ready"
  | "resync_required";

/** What the host is told about the room, in one place. */
export interface HostReadySummary {
  readonly membersReady: number;
  readonly membersWaiting: number;
  readonly participantCount: number;
  /** Members joined after the room already reached "everyone ready". */
  readonly lateJoinerProfileIds: readonly string[];
  /** Joined members whose confirmation has been outstanding too long. */
  readonly timedOutProfileIds: readonly string[];
  readonly providerSelected: boolean;
  readonly countdownAvailable: boolean;
  readonly blockReason: ReadyBlockReason | null;
}

/** The room's readiness verdict at one instant. Immutable. */
export interface ReadySnapshot {
  readonly roomId: string;
  readonly viewerState: ViewerReadyState;
  readonly viewerIsReady: boolean;
  /** True once the viewer confirmed and is now waiting on other people. */
  readonly isWaitingForOthers: boolean;
  readonly everyoneReady: boolean;
  readonly readyCount: number;
  readonly waitingCount: number;
  readonly participantCount: number;
  readonly readyProfileIds: readonly string[];
  readonly waitingProfileIds: readonly string[];
  readonly timedOutProfileIds: readonly string[];
  readonly lateJoinerProfileIds: readonly string[];
  readonly viewerTimedOut: boolean;
  readonly countdownAvailable: boolean;
  readonly blockReason: ReadyBlockReason | null;
  /**
   * True whenever the room should be reminded that playback is theirs to
   * start. StreamFlow never presses play, so this is shown from the moment the
   * room is ready right through the countdown.
   */
  readonly manualPlayReminderDue: boolean;
  readonly hostSummary: HostReadySummary;
  readonly observedAt: string;
}

export interface ReadyEvaluationInput {
  readonly roomId: string;
  readonly viewerProfileId: string | null;
  /** Joined roster with the viewer's own row included. */
  readonly participants: readonly ReadyParticipantInput[];
  /** The host has chosen a provider for the room (Sprint 2.2). */
  readonly hasProvider: boolean;
  /**
   * This device has attempted its provider hand-off but not yet confirmed.
   * Launch status is local to the viewer (Sprint 2.8), so it can only ever
   * shape the viewer's own state, never the room's counts.
   */
  readonly launchPending: boolean;
  /** The room's synchronization verdict, from `RoomSyncCoordinator`. */
  readonly syncSnapshot: RoomSyncSnapshot | null;
  /** Profiles already present the last time the room reached everyone-ready. */
  readonly establishedProfileIds?: readonly string[];
}

export interface ReadyCoordinator {
  /** Folds the roster, the provider choice, and sync into one verdict. */
  evaluate(input: ReadyEvaluationInput): ReadySnapshot;
  /** The only sanctioned answer to "may the host offer a countdown?". */
  isCountdownAvailable(snapshot: ReadySnapshot): boolean;
  /** The only sanctioned answer to "has this confirmation gone stale?". */
  hasReadyTimedOut(waitingSinceMs: number | null): boolean;
}

export interface ReadyCoordinatorDependencies {
  readonly roomSync: RoomSyncCoordinator;
  readonly clock: Clock;
}

export function resolveReadyCoordinatorDependencies(
  deps: ReadyCoordinatorDependencies,
): ReadyCoordinatorDependencies {
  return deps;
}

export const READY_COORDINATOR = createServiceToken<ReadyCoordinator>("ReadyCoordinator");

export function createReadyCoordinator(deps: ReadyCoordinatorDependencies): ReadyCoordinator {
  const { roomSync, clock } = deps;

  const timedOut = (waitingSinceMs: number | null, nowMs: number): boolean =>
    waitingSinceMs !== null && nowMs - waitingSinceMs >= READY_CONFIRMATION.TIMEOUT_MS;

  return {
    evaluate(input) {
      const observedAtDate = clock.now();
      const observedAt = observedAtDate.toISOString();
      const nowMs = observedAtDate.getTime();
      const joined = input.participants.filter((participant) => participant.isJoined);

      const ready = joined.filter((participant) => participant.isReady);
      const waiting = joined.filter((participant) => !participant.isReady);
      const everyoneReady = joined.length > 0 && waiting.length === 0;

      // Sync is never re-derived here: the room's band is whatever the sync
      // coordinator says it is (Sprint 2.6 engineering rule).
      const syncAllows = input.syncSnapshot
        ? roomSync.canStartCountdown(input.syncSnapshot)
        : joined.length > 0;

      const blockReason: ReadyBlockReason | null =
        joined.length === 0
          ? "no_participants"
          : !syncAllows
            ? "resync_required"
            : !input.hasProvider
              ? "no_provider"
              : !everyoneReady
                ? "not_everyone_ready"
                : null;

      const established = new Set(input.establishedProfileIds ?? []);
      const lateJoiners =
        established.size > 0
          ? joined
              .filter((participant) => !established.has(participant.profileId))
              .map((participant) => participant.profileId)
          : [];

      const viewer = input.viewerProfileId
        ? (joined.find((participant) => participant.profileId === input.viewerProfileId) ?? null)
        : null;

      const viewerState: ViewerReadyState = !viewer
        ? "not_member"
        : viewer.isReady
          ? everyoneReady
            ? "everyone_ready"
            : "waiting_for_others"
          : input.launchPending
            ? "launch_pending"
            : "not_ready";

      const timedOutProfileIds = waiting
        .filter((participant) => timedOut(participant.waitingSinceMs, nowMs))
        .map((participant) => participant.profileId);

      const countdownAvailable = blockReason === null;

      return {
        roomId: input.roomId,
        viewerState,
        viewerIsReady: viewer?.isReady ?? false,
        isWaitingForOthers: viewerState === "waiting_for_others",
        everyoneReady,
        readyCount: ready.length,
        waitingCount: waiting.length,
        participantCount: joined.length,
        readyProfileIds: ready.map((participant) => participant.profileId),
        waitingProfileIds: waiting.map((participant) => participant.profileId),
        timedOutProfileIds,
        lateJoinerProfileIds: lateJoiners,
        viewerTimedOut: viewer ? timedOut(viewer.waitingSinceMs, nowMs) && !viewer.isReady : false,
        countdownAvailable,
        blockReason,
        // The reminder exists because StreamFlow cannot press play for anyone.
        // It is due as soon as the room could plausibly start.
        manualPlayReminderDue: everyoneReady || countdownAvailable,
        hostSummary: {
          membersReady: ready.length,
          membersWaiting: waiting.length,
          participantCount: joined.length,
          lateJoinerProfileIds: lateJoiners,
          timedOutProfileIds,
          providerSelected: input.hasProvider,
          countdownAvailable,
          blockReason,
        },
        observedAt,
      };
    },

    isCountdownAvailable: (snapshot) => snapshot.countdownAvailable,

    hasReadyTimedOut: (waitingSinceMs) => timedOut(waitingSinceMs, clock.now().getTime()),
  };
}
