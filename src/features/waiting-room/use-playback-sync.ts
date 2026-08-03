/**
 * Playback synchronization hook — Sprint 2.7.
 *
 * The Feature-layer half of `PlaybackSyncEngine`. It gathers what the lobby
 * already holds — the playback runtime, the room's clock verdict, the roster —
 * and hands it to Domain for a decision. It classifies nothing itself: this
 * sprint's engineering rule is that only `ClockSyncService`,
 * `RoomSyncCoordinator`, and `PlaybackSyncEngine` may answer questions about
 * timing, drift, health, readiness, or correction policy.
 *
 * Responsibilities, all mechanical:
 *  1. re-evaluate on a slow cadence and whenever its inputs move,
 *  2. announce synchronization-state transitions once each — never drift values,
 *  3. re-publish `require_resync` over the existing realtime foundation (host),
 *  4. hold a short "recovering" beat so the lobby does not flicker.
 *
 * Nothing here controls a player. In manual-sync rooms no participant reports
 * a position at all, and that is a supported, honest state — not an error.
 */
import { useEffect, useMemo, useRef, useState } from "react";

import {
  PLAYBACK_SYNC_ENGINE,
  isServiceBound,
  resolveService,
  type MemberPresence,
  type ParticipantPlaybackReport,
  type PlaybackHealth,
  type PlaybackRuntime,
  type PlaybackSyncDecision,
  type PlaybackSyncSnapshot,
  type RoomSyncSnapshot,
} from "@/domain";
import { useAnnouncer } from "@/foundation/accessibility";
import { logger } from "@/foundation/logging";
import { useTranslation } from "@/foundation/localization";
import { PLAYBACK_SYNC_RUNTIME } from "@/shared/constants/system-constants";

import type { MemberView } from "./waiting-room.types";

const MODULE = "waiting-room-playback-sync";

/** Announcement copy per decision. Transitions only, never drift numbers. */
export const PLAYBACK_SYNC_DECISION_KEYS: Readonly<Record<PlaybackSyncDecision, string>> =
  Object.freeze({
    stay_synchronized: "room.playback_sync.decision.stay_synchronized",
    recommend_resync: "room.playback_sync.decision.recommend_resync",
    require_resync: "room.playback_sync.decision.require_resync",
    waiting: "room.playback_sync.decision.waiting",
    recovering: "room.playback_sync.decision.recovering",
  });

export interface PlaybackSyncModel {
  readonly snapshot: PlaybackSyncSnapshot | null;
  readonly decision: PlaybackSyncDecision;
  readonly health: PlaybackHealth;
  /** Authoritative media position, derived by Domain from the room anchor. */
  readonly positionMs: number | null;
  readonly isAnchorStale: boolean;
  readonly inSyncCount: number;
  readonly outOfSyncCount: number;
  readonly unmeasuredCount: number;
  readonly participantCount: number;
  /** The four lobby states this sprint replaces static readiness with. */
  readonly isPlaybackReady: boolean;
  readonly isSynchronizationReady: boolean;
  readonly isWaitingForManualPlay: boolean;
  readonly isWaitingForResync: boolean;
  /** Correction class Domain considers eligible; never one that was applied. */
  readonly correctionKind: "none" | "soft" | "hard";
  /** Po: quiet celebration the moment the room becomes synchronization ready. */
  readonly justBecameReady: boolean;
  /** Po: calm encouragement while a re-sync is recommended or required. */
  readonly needsEncouragement: boolean;
  readonly isAvailable: boolean;
}

export interface UsePlaybackSyncInput {
  readonly roomId: string;
  readonly runtime: PlaybackRuntime | null;
  readonly roomSyncSnapshot: RoomSyncSnapshot | null;
  readonly members: readonly MemberView[];
  readonly presenceByProfileId: ReadonlyMap<string, MemberPresence>;
  readonly isHost: boolean;
  readonly actorProfileId: string | null;
  readonly enabled: boolean;
}

export function usePlaybackSync({
  roomId,
  runtime,
  roomSyncSnapshot,
  members,
  presenceByProfileId,
  isHost,
  actorProfileId,
  enabled,
}: UsePlaybackSyncInput): PlaybackSyncModel {
  const { t } = useTranslation();
  const announce = useAnnouncer();

  const engine = useMemo(
    () => (isServiceBound(PLAYBACK_SYNC_ENGINE) ? resolveService(PLAYBACK_SYNC_ENGINE) : null),
    [],
  );

  const [snapshot, setSnapshot] = useState<PlaybackSyncSnapshot | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [justBecameReady, setJustBecameReady] = useState(false);
  const [tick, setTick] = useState(0);

  const lastDecision = useRef<PlaybackSyncDecision | null>(null);
  const wasReady = useRef(false);

  const available = engine !== null && enabled;

  /**
   * Participant reports. Manual-sync rooms report no position — StreamFlow
   * cannot read a provider's player and never will — so `positionMs` is null
   * and Domain records the participant as unmeasured rather than as in sync.
   */
  const reports: readonly ParticipantPlaybackReport[] = useMemo(
    () =>
      members
        .filter((member) => member.state === "joined")
        .map((member) => ({
          profileId: member.profileId,
          positionMs: null,
          isOnline: presenceByProfileId.get(member.profileId)?.isOnline ?? false,
          observedAt: new Date().toISOString(),
        })),
    [members, presenceByProfileId],
  );

  // A slow heartbeat so the derived position stays current while armed. It
  // only asks Domain again; it computes nothing on its own.
  useEffect(() => {
    if (!available) return;
    const timer = window.setInterval(
      () => setTick((value) => value + 1),
      PLAYBACK_SYNC_RUNTIME.EVALUATION_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [available]);

  useEffect(() => {
    if (!engine || !available) {
      setSnapshot(null);
      return;
    }
    void tick;
    setSnapshot(
      engine.evaluate({ roomId, runtime, roomSync: roomSyncSnapshot, reports, isRecovering }),
    );
  }, [available, engine, isRecovering, reports, roomId, roomSyncSnapshot, runtime, tick]);

  const decision: PlaybackSyncDecision = snapshot?.decision ?? "waiting";

  // Accessibility: one announcement per transition. Deltas, positions, and
  // millisecond values are deliberately never spoken.
  useEffect(() => {
    if (!snapshot) return;
    if (lastDecision.current === decision) return;
    const previous = lastDecision.current;
    lastDecision.current = decision;
    if (previous === null) return;

    announce(
      t(PLAYBACK_SYNC_DECISION_KEYS[decision]),
      decision === "require_resync" ? "assertive" : "polite",
    );

    if (previous === "require_resync" && decision !== "require_resync") {
      setIsRecovering(true);
    }
  }, [announce, decision, snapshot, t]);

  // The recovering beat fades on its own; it is a courtesy, not a state.
  useEffect(() => {
    if (!isRecovering) return;
    const timer = window.setTimeout(
      () => setIsRecovering(false),
      PLAYBACK_SYNC_RUNTIME.RECOVERY_WINDOW_MS,
    );
    return () => window.clearTimeout(timer);
  }, [isRecovering]);

  // Po's quiet celebration: the edge into synchronization readiness, once.
  const isSynchronizationReady = snapshot?.isSynchronizationReady ?? false;
  useEffect(() => {
    if (!isSynchronizationReady) {
      wasReady.current = false;
      setJustBecameReady(false);
      return;
    }
    if (wasReady.current) return;
    wasReady.current = true;
    setJustBecameReady(true);
    const timer = window.setTimeout(
      () => setJustBecameReady(false),
      PLAYBACK_SYNC_RUNTIME.RECOVERY_WINDOW_MS,
    );
    return () => window.clearTimeout(timer);
  }, [isSynchronizationReady]);

  // Realtime fan-out over the existing foundation: only the host re-publishes,
  // only on `require_resync`, and only as a request to people.
  useEffect(() => {
    if (!engine || !available || !isHost || !actorProfileId || !snapshot) return;
    if (snapshot.decision !== "require_resync") return;
    void engine
      .publishSyncState(snapshot, { correlationId: crypto.randomUUID(), actorProfileId })
      .catch((cause: unknown) => {
        logger.warn("Playback sync publish failed", { module: MODULE, roomId, error: cause });
      });
    // Keyed on the decision, so a steady room republishes nothing.
  }, [actorProfileId, available, engine, isHost, roomId, snapshot?.decision]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    snapshot,
    decision,
    health: snapshot?.health ?? "unknown",
    positionMs: snapshot?.position?.positionMs ?? null,
    isAnchorStale: snapshot?.position?.isStale ?? false,
    inSyncCount: snapshot?.inSyncCount ?? 0,
    outOfSyncCount: snapshot?.outOfSyncCount ?? 0,
    unmeasuredCount: snapshot?.unmeasuredCount ?? 0,
    participantCount: snapshot?.participantCount ?? 0,
    isPlaybackReady: snapshot?.isPlaybackReady ?? false,
    isSynchronizationReady,
    isWaitingForManualPlay: snapshot?.isWaitingForManualPlay ?? false,
    isWaitingForResync: snapshot?.isWaitingForResync ?? false,
    correctionKind: snapshot?.correction.kind ?? "none",
    justBecameReady,
    needsEncouragement: decision === "recommend_resync" || decision === "require_resync",
    isAvailable: available && engine !== null && engine.isAvailable(),
  };
}
