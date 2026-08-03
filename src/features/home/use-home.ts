/**
 * Home experience hook — Milestone E.
 *
 * Answers one question for the signed-in person: "what can I do right now?"
 * Every rule about which room is resumable, which invites are still pending
 * and whether this is a first visit belongs to `HomeReadModel`; this hook only
 * loads, tracks what is in flight, and re-reads afterwards.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  HOME_READ_MODEL,
  ROOM_FLOW_SERVICE,
  isServiceBound,
  resolveService,
  type HomeSnapshot,
} from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "home";

const EMPTY_SNAPSHOT: HomeSnapshot = Object.freeze({
  continueRoom: null,
  liveRooms: [],
  recentRooms: [],
  pendingInvites: [],
  hostedRoomCount: 0,
  isFirstTime: true,
});

export type HomePendingAction = "create" | "join" | "invite" | null;

export interface HomeModel {
  readonly snapshot: HomeSnapshot;
  readonly isLoading: boolean;
  /** False when no persistence adapter is bound: the page says so plainly. */
  readonly isAvailable: boolean;
  readonly error: unknown;
  readonly pending: HomePendingAction;
  /** Id of the invite currently being answered, for per-row busy state. */
  readonly pendingInviteId: string | null;
  refresh(): void;
  createRoom(name: string): Promise<string | null>;
  joinByCode(code: string): Promise<string | null>;
  acceptInvite(inviteId: string): Promise<string | null>;
  declineInvite(inviteId: string): Promise<void>;
}

export function useHome(viewerProfileId: string | null): HomeModel {
  const [snapshot, setSnapshot] = useState<HomeSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState<HomePendingAction>(null);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const home = useMemo(
    () => (isServiceBound(HOME_READ_MODEL) ? resolveService(HOME_READ_MODEL) : null),
    [],
  );
  const rooms = useMemo(
    () => (isServiceBound(ROOM_FLOW_SERVICE) ? resolveService(ROOM_FLOW_SERVICE) : null),
    [],
  );

  useEffect(() => {
    if (!home || !viewerProfileId) {
      setSnapshot(EMPTY_SNAPSHOT);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    home
      .loadHome(viewerProfileId)
      .then((next) => {
        if (!active) return;
        setSnapshot(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        logger.warn("Home snapshot failed", { module: MODULE, error: cause });
        if (active) setError(cause);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [home, reloadToken, viewerProfileId]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  const intent = useCallback(
    () => ({ correlationId: crypto.randomUUID(), actorProfileId: viewerProfileId }),
    [viewerProfileId],
  );

  const run = useCallback(
    async <T>(
      action: Exclude<HomePendingAction, null>,
      operation: () => Promise<T>,
    ): Promise<T | null> => {
      setPending(action);
      setError(null);
      try {
        const result = await operation();
        refresh();
        return result;
      } catch (cause) {
        logger.warn("Home action failed", { module: MODULE, action, error: cause });
        setError(cause);
        return null;
      } finally {
        setPending(null);
        setPendingInviteId(null);
      }
    },
    [refresh],
  );

  const createRoom = useCallback(
    async (name: string) => {
      if (!rooms || !viewerProfileId) return null;
      return run("create", async () => {
        const result = await rooms.createRoom(
          { hostProfileId: viewerProfileId, name: name.trim(), visibility: "private" },
          intent(),
        );
        return result.room.id;
      });
    },
    [intent, rooms, run, viewerProfileId],
  );

  const joinByCode = useCallback(
    async (code: string) => {
      if (!rooms || !viewerProfileId) return null;
      return run("join", async () => {
        const room = await rooms.getRoomByCode(code);
        await rooms.joinRoom({ roomId: room.id, profileId: viewerProfileId }, intent());
        return room.id;
      });
    },
    [intent, rooms, run, viewerProfileId],
  );

  const acceptInvite = useCallback(
    async (inviteId: string) => {
      if (!rooms || !viewerProfileId) return null;
      setPendingInviteId(inviteId);
      return run("invite", async () => {
        const { member } = await rooms.acceptInvite(
          { inviteId, profileId: viewerProfileId },
          intent(),
        );
        return member.roomId;
      });
    },
    [intent, rooms, run, viewerProfileId],
  );

  const declineInvite = useCallback(
    async (inviteId: string) => {
      if (!rooms || !viewerProfileId) return;
      setPendingInviteId(inviteId);
      await run("invite", () =>
        rooms.declineInvite({ inviteId, profileId: viewerProfileId }, intent()),
      );
    },
    [intent, rooms, run, viewerProfileId],
  );

  return useMemo(
    () => ({
      snapshot,
      isLoading,
      isAvailable: home !== null && rooms !== null,
      error,
      pending,
      pendingInviteId,
      refresh,
      createRoom,
      joinByCode,
      acceptInvite,
      declineInvite,
    }),
    [
      acceptInvite,
      createRoom,
      declineInvite,
      error,
      home,
      isLoading,
      joinByCode,
      pending,
      pendingInviteId,
      refresh,
      rooms,
      snapshot,
    ],
  );
}
