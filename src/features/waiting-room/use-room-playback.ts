/**
 * Room playback hook — Sprint 2.4.
 *
 * The Feature-layer half of playback orchestration. It observes, it does not
 * decide: every rule (who owns playback, what may follow what, when a room is
 * ready) lives in `PlaybackCoordinator`. This hook only
 *
 *  1. reads the durable playback runtime and re-reads it on a realtime notice,
 *  2. asks the owner's client to arm the room once the countdown completed,
 *  3. announces "Countdown complete." then "Waiting for playback.".
 *
 * Becoming ready starts nothing. No player is touched, no provider is
 * contacted, no synchronization is attempted — each participant presses play
 * in their own app.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  PLAYBACK_COORDINATOR,
  ROOM_READ_MODEL,
  isServiceBound,
  resolveService,
  type CountdownRuntimeState,
  type PlaybackMachineState,
  type PlaybackRuntime,
  type PlaybackSnapshot,
} from "@/domain";
import { useAnnouncer } from "@/foundation/accessibility";
import { logger } from "@/foundation/logging";
import { useTranslation } from "@/foundation/localization";

import { toWaitingRoomError } from "./waiting-room-state";
import type { WaitingRoomError } from "./waiting-room.types";

const MODULE = "waiting-room-playback";

export interface RoomPlaybackModel {
  readonly state: PlaybackMachineState;
  readonly snapshot: PlaybackSnapshot | null;
  /** The durable runtime, handed to `PlaybackSyncEngine` for its anchor. */
  readonly runtime: PlaybackRuntime | null;
  /** The room is armed: everyone may press play in their own app. */
  readonly isReady: boolean;
  readonly ownerProfileId: string | null;
  readonly isOwner: boolean;
  readonly sessionId: string | null;
  readonly error: WaitingRoomError | null;
  /** False when no playback store is bound; the panel renders inert. */
  readonly isAvailable: boolean;
  readonly isArming: boolean;
  refresh(): void;
}

export interface UseRoomPlaybackInput {
  readonly roomId: string;
  readonly actorProfileId: string | null;
  readonly isHost: boolean;
  /** Drives the single post-countdown transition into `ready`. */
  readonly countdownState: CountdownRuntimeState;
  readonly enabled: boolean;
}

const IDLE_STATE: PlaybackMachineState = "idle";

export function useRoomPlayback({
  roomId,
  actorProfileId,
  isHost,
  countdownState,
  enabled,
}: UseRoomPlaybackInput): RoomPlaybackModel {
  const { t } = useTranslation();
  const announce = useAnnouncer();

  const coordinator = useMemo(
    () => (isServiceBound(PLAYBACK_COORDINATOR) ? resolveService(PLAYBACK_COORDINATOR) : null),
    [],
  );
  const readModel = useMemo(
    () => (isServiceBound(ROOM_READ_MODEL) ? resolveService(ROOM_READ_MODEL) : null),
    [],
  );

  const [runtime, setRuntime] = useState<PlaybackRuntime | null>(null);
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot | null>(null);
  const [error, setError] = useState<WaitingRoomError | null>(null);
  const [isArming, setIsArming] = useState(false);

  const mounted = useRef(true);
  const arming = useRef(false);
  const announcedCountdown = useRef(false);
  const announcedReady = useRef(false);

  const available = coordinator !== null && coordinator.isAvailable() && enabled;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!coordinator || !available) return;
    try {
      const next = await coordinator.read(roomId);
      if (!mounted.current) return;
      setRuntime(next);
      setSnapshot(coordinator.project(next));
    } catch (cause) {
      if (!mounted.current) return;
      // A failed read dims the panel; it never breaks the lobby.
      logger.warn("Playback read failed", { module: MODULE, roomId, error: cause });
    }
  }, [available, coordinator, roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime, consumed through Domain exactly as the roster does: a notice
  // means "re-read", never "trust this payload".
  useEffect(() => {
    if (!readModel || !available) return;
    let detach: (() => void) | null = null;
    let cancelled = false;

    void readModel
      .subscribeToRoom(roomId, () => {
        void load();
      })
      .then((unsubscribe) => {
        if (cancelled) {
          unsubscribe();
          return;
        }
        detach = unsubscribe;
      });

    return () => {
      cancelled = true;
      detach?.();
    };
  }, [available, load, readModel, roomId]);

  // The one transition this sprint owns: countdown completed -> room ready.
  // Only the owner's client writes it; everyone else observes the result.
  useEffect(() => {
    if (!coordinator || !available || !actorProfileId || !isHost) return;
    if (countdownState !== "completed") return;
    if (runtime && (runtime.state === "ready" || runtime.state === "playing")) return;
    if (arming.current) return;

    arming.current = true;
    setIsArming(true);
    void coordinator
      .arm({ roomId, actorProfileId }, { correlationId: crypto.randomUUID(), actorProfileId })
      .then(() => load())
      .catch((cause: unknown) => {
        logger.warn("Playback arm failed", { module: MODULE, roomId, error: cause });
        if (mounted.current) setError(toWaitingRoomError(cause));
      })
      .finally(() => {
        arming.current = false;
        if (mounted.current) setIsArming(false);
      });
  }, [actorProfileId, available, coordinator, countdownState, isHost, load, roomId, runtime]);

  // Accessibility: the two announcements the sprint specifies, once each.
  useEffect(() => {
    if (countdownState !== "completed") {
      announcedCountdown.current = false;
      return;
    }
    if (announcedCountdown.current) return;
    announcedCountdown.current = true;
    announce(t("room.playback.announce.countdown_complete"), "assertive");
  }, [announce, countdownState, t]);

  useEffect(() => {
    if (runtime?.state !== "ready") {
      // Leaving `ready` re-arms the announcement for the next time round.
      if (runtime) announcedReady.current = false;
      return;
    }
    if (announcedReady.current) return;
    announcedReady.current = true;
    announce(t("room.playback.announce.waiting_for_playback"), "polite");
  }, [announce, runtime, t]);

  return {
    state: runtime?.state ?? IDLE_STATE,
    snapshot,
    runtime,
    isReady: runtime?.state === "ready",
    ownerProfileId: runtime?.ownerProfileId ?? null,
    isOwner: coordinator && runtime ? coordinator.isOwner(runtime, actorProfileId) : false,
    sessionId: runtime?.sessionId ?? null,
    error,
    isAvailable: available,
    isArming,
    refresh: () => void load(),
  };
}
