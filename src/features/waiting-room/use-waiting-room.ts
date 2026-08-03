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

import { useCoarseNow } from "./use-coarse-now";
import { useMemberNames } from "./use-member-names";
import { useRoomClockSync, type RoomClockSyncModel } from "./use-room-clock-sync";
import { useRoomPresence } from "./use-room-presence";
import { useRoomRealtime } from "./use-room-realtime";
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

const EMPTY_MEMBERS: readonly MemberView[] = Object.freeze([]);

const ABSENT_VIEWER: ViewerView = {
  profileId: null,
  memberId: null,
  isMember: false,
  isHost: false,
  isReady: false,
  canJoin: false,
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

  // Milestone D.5: one shared subscription per room. A coalesced notice still
  // means "re-read" — the hub only guarantees it happens once.
  const realtime = useRoomRealtime(roomId, Boolean(readModel), () => {
    void load();
  });

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

  const viewerIsMember = snapshot?.viewerMembership?.state === "joined";
  const viewerIsHost =
    snapshot?.viewerMembership?.role === "host" ||
    (snapshot?.room.hostProfileId ?? null) === profileId;

  const join = useCallback(() => {
    if (!profileId) return;
    const flow = resolveService(ROOM_FLOW_SERVICE);
    void run("join", () => flow.joinRoom({ roomId, profileId }, newIntent(profileId)));
  }, [profileId, roomId, run]);

  /**
   * Sprint J.2 — departure is one act with two shapes. A guest releases their
   * seat; the host ends the room, because a hostless room has no authority
   * left to run a countdown. Both settle into `departed`, which is the signal
   * Presentation uses to return the person Home.
   */
  const leave = useCallback(() => {
    if (!profileId) return;
    const flow = resolveService(ROOM_FLOW_SERVICE);
    void run("leave", async () => {
      if (viewerIsHost) {
        await flow.endRoom({ roomId, actorProfileId: profileId }, newIntent(profileId));
      } else {
        await flow.leaveRoom({ roomId, profileId }, newIntent(profileId));
      }
      if (mounted.current) setDeparted(true);
    });
  }, [profileId, roomId, run, viewerIsHost]);

  const setReady = useCallback(
    (ready: boolean) => {
      const memberId = snapshot?.viewerMembership?.id;
      if (!memberId || !readModel) return;
      void run("readiness", () => readModel.setReadiness(memberId, ready));
    },
    [readModel, run, snapshot],
  );


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

  // Held in a ref so `refresh` stays stable across renders.
  const presenceRefresh = useRef(presence.refresh);
  presenceRefresh.current = presence.refresh;

  const isReady = useCallback(
    (member: RoomMember) => readModel?.isReady(member) ?? false,
    [readModel],
  );

  // Milestone D.5 — every projection below is memoized and derives "now" from
  // a coarse beat rather than the render itself. A render must never mint new
  // roster identities, or the hooks that consume them re-evaluate forever.
  const now = useCoarseNow();

  // Sprint J.1 — people, not identifiers.
  const memberProfileIds = useMemo(
    () => (snapshot ? snapshot.members.map((member) => member.profileId) : []),
    [snapshot],
  );
  const memberNames = useMemberNames(memberProfileIds);

  const members = useMemo(
    () =>
      snapshot
        ? toMemberViews(
            snapshot,
            profileId,
            isReady,
            {
              byProfileId: presence.byProfileId,
              isTracking: presence.isTracking,
              now,
            },
            memberNames,
          )
        : EMPTY_MEMBERS,
    [isReady, memberNames, now, presence.byProfileId, presence.isTracking, profileId, snapshot],
  );

  const joined = useMemo(() => members.filter((member) => member.state === "joined"), [members]);

  const room = useMemo(() => (snapshot ? toRoomSummary(snapshot) : null), [snapshot]);
  const viewer = useMemo(
    () => (snapshot ? toViewerView(snapshot, profileId, isReady) : ABSENT_VIEWER),
    [isReady, profileId, snapshot],
  );
  const lastArrivalProfileId = useMemo(
    () => (joined.length > 0 ? (joined[joined.length - 1]?.profileId ?? null) : null),
    [joined],
  );

  const roomSync = useRoomSync({
    roomId,
    members,
    presenceByProfileId: presence.byProfileId,
    isHost: Boolean(viewerIsHost),
    actorProfileId: profileId,
    ownHealth: clockSync.health,
    enabled: status === "ready" && Boolean(viewerIsMember),
  });

  const refresh = useCallback(() => {
    void load();
    presenceRefresh.current();
  }, [load]);

  return {
    status,
    error,
    room,
    members,
    isPresenceTracked: presence.isTracking,
    presenceByProfileId: presence.byProfileId,
    lastArrivalProfileId,
    clockSync,
    roomSync,
    viewer,
    pending,
    isLive: realtime.isLive,
    refresh,
    join,
    leave,
    setReady,
  };
}
