/**
 * Waiting Room state hook — Sprint 2.0.
 *
 * One capability: showing who is in the lobby and letting the viewer join,
 * leave, and signal readiness. It orchestrates nothing itself — every
 * mutation goes through `RoomFlowService`, every read through the room read
 * model, and realtime notices only trigger a re-read (Foundation §4).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ROOM_FLOW_SERVICE,
  ROOM_READ_MODEL,
  isServiceBound,
  resolveService,
  type MemberPresence,
  type RoomMember,
  type WaitingRoomSnapshot,
} from "@/domain";
import { useAuth } from "@/features/auth";
import { logger } from "@/foundation/logging";

import { useRoomClockSync, type RoomClockSyncModel } from "./use-room-clock-sync";
import { useRoomPresence } from "./use-room-presence";
import { useRoomSync, type RoomSyncModel } from "./use-room-sync";
import {
  toMemberViews,
  toRoomSummary,
  toViewerView,
  toWaitingRoomError,
} from "./waiting-room-state";
import type {
  MemberView,
  RoomSummaryView,
  ViewerView,
  WaitingRoomError,
  WaitingRoomPendingAction,
  WaitingRoomStatus,
} from "./waiting-room.types";

const MODULE = "waiting-room";

export interface WaitingRoomModel {
  readonly status: WaitingRoomStatus;
  readonly error: WaitingRoomError | null;
  readonly room: RoomSummaryView | null;
  readonly members: readonly MemberView[];
  readonly viewer: ViewerView;
  readonly pending: WaitingRoomPendingAction;
  /** True once a realtime transport is attached for this room. */
  readonly isLive: boolean;
  /** True while a presence store is reporting liveness for this room. */
  readonly isPresenceTracked: boolean;
  /** Live presence rows by profile, for the synchronization pipeline. */
  readonly presenceByProfileId: ReadonlyMap<string, MemberPresence>;
  /** Every joined member has signalled ready (and there is at least one). */
  readonly allReady: boolean;
  /** Profile id of the most recent arrival, for the Po companion's gaze. */
  readonly lastArrivalProfileId: string | null;
  /** This device's own clock estimate (Sprint 2.5). */
  readonly clockSync: RoomClockSyncModel;
  /**
   * The room's synchronization verdict (Sprint 2.6). The only place the lobby
   * may read health, readiness counts, or countdown eligibility from.
   */
  readonly roomSync: RoomSyncModel;
  refresh(): void;
  join(): void;
  leave(): void;
  setReady(ready: boolean): void;
}

const ABSENT_VIEWER: ViewerView = {
  profileId: null,
  memberId: null,
  isMember: false,
  isHost: false,
  isReady: false,
};

function newIntent(actorProfileId: string) {
  return { correlationId: crypto.randomUUID(), actorProfileId };
}

export function useWaitingRoom(roomId: string): WaitingRoomModel {
  const auth = useAuth();
  const profileId = auth.session?.identity.profileId ?? null;

  const [snapshot, setSnapshot] = useState<WaitingRoomSnapshot | null>(null);
  const [status, setStatus] = useState<WaitingRoomStatus>("loading");
  const [error, setError] = useState<WaitingRoomError | null>(null);
  const [pending, setPending] = useState<WaitingRoomPendingAction>(null);
  const [isLive, setIsLive] = useState(false);
  const mounted = useRef(true);

  const readModel = useMemo(
    () => (isServiceBound(ROOM_READ_MODEL) ? resolveService(ROOM_READ_MODEL) : null),
    [],
  );

  const load = useCallback(async () => {
    if (!readModel) {
      setStatus("error");
      setError({ code: "SF-SYS-SERVICE-UNAVAILABLE", messageKey: "error.sys.service_unavailable" });
      return;
    }
    try {
      const next = await readModel.loadWaitingRoom(roomId, profileId);
      if (!mounted.current) return;
      setSnapshot(next);
      setError(null);
      setStatus("ready");
    } catch (cause) {
      if (!mounted.current) return;
      logger.warn("Waiting room load failed", { module: MODULE, roomId, error: cause });
      setError(toWaitingRoomError(cause));
      setStatus("error");
    }
  }, [profileId, readModel, roomId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  // Sprint 1.9 realtime, consumed through Domain: a notice means "re-read".
  useEffect(() => {
    if (!readModel) return;
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
        setIsLive(true);
      });

    return () => {
      cancelled = true;
      setIsLive(false);
      detach?.();
    };
  }, [load, readModel, roomId]);

  const run = useCallback(
    async (action: Exclude<WaitingRoomPendingAction, null>, operation: () => Promise<unknown>) => {
      setPending(action);
      try {
        await operation();
        await load();
      } catch (cause) {
        if (!mounted.current) return;
        logger.warn("Waiting room action failed", { module: MODULE, action, error: cause });
        setError(toWaitingRoomError(cause));
      } finally {
        if (mounted.current) setPending(null);
      }
    },
    [load],
  );

  const join = useCallback(() => {
    if (!profileId) return;
    const flow = resolveService(ROOM_FLOW_SERVICE);
    void run("join", () => flow.joinRoom({ roomId, profileId }, newIntent(profileId)));
  }, [profileId, roomId, run]);

  const leave = useCallback(() => {
    if (!profileId) return;
    const flow = resolveService(ROOM_FLOW_SERVICE);
    void run("leave", () => flow.leaveRoom({ roomId, profileId }, newIntent(profileId)));
  }, [profileId, roomId, run]);

  const setReady = useCallback(
    (ready: boolean) => {
      const memberId = snapshot?.viewerMembership?.id;
      if (!memberId || !readModel) return;
      void run("readiness", () => readModel.setReadiness(memberId, ready));
    },
    [readModel, run, snapshot],
  );

  const viewerIsMember = snapshot?.viewerMembership?.state === "joined";
  const viewerIsHost =
    snapshot?.viewerMembership?.role === "host" ||
    (snapshot?.room.hostProfileId ?? null) === profileId;

  // Sprint 2.5 measures this device's clock; Sprint 2.6 carries the result on
  // the presence heartbeat so the room can aggregate it.
  const clockSync = useRoomClockSync({
    roomId,
    profileId,
    enabled: status === "ready" && Boolean(viewerIsMember),
  });

  const presence = useRoomPresence(roomId, profileId, status === "ready", {
    clockOffsetMs: clockSync.snapshot?.offset?.offsetMs ?? null,
    latencyMs: clockSync.snapshot?.offset?.latencyMs ?? null,
  });

  const isReady = useCallback(
    (member: RoomMember) => readModel?.isReady(member) ?? false,
    [readModel],
  );

  const members = snapshot
    ? toMemberViews(snapshot, profileId, isReady, {
        byProfileId: presence.byProfileId,
        isTracking: presence.isTracking,
        now: Date.now(),
      })
    : [];
  const joined = members.filter((member) => member.state === "joined");

  const roomSync = useRoomSync({
    roomId,
    members,
    presenceByProfileId: presence.byProfileId,
    isHost: Boolean(viewerIsHost),
    actorProfileId: profileId,
    ownHealth: clockSync.health,
    enabled: status === "ready" && Boolean(viewerIsMember),
  });

  return {
    status,
    error,
    room: snapshot ? toRoomSummary(snapshot) : null,
    members,
    isPresenceTracked: presence.isTracking,
    presenceByProfileId: presence.byProfileId,
    allReady: joined.length > 0 && joined.every((member) => member.isReady),
    lastArrivalProfileId: joined.length > 0 ? (joined[joined.length - 1]?.profileId ?? null) : null,
    clockSync,
    roomSync,
    viewer: snapshot ? toViewerView(snapshot, profileId, isReady) : ABSENT_VIEWER,
    pending,
    isLive,
    refresh: () => {
      void load();
      presence.refresh();
    },
    join,
    leave,
    setReady,
  };
}
