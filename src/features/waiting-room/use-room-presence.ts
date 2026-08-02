/**
 * Room presence hook — Sprint 2.1.
 *
 * Two jobs, both mechanical: send this tab's heartbeat while the Waiting Room
 * is open, and re-read the room's liveness on the same cadence. Every rule —
 * what counts as online, when a room is inactive — stays in Domain
 * (`PresenceCoordinator` over `PresenceService`); this hook only schedules.
 *
 * The connection identifier is minted per tab and lives in memory only. It is
 * not a session, carries no credential, and is never a provider artifact
 * (Session Continuity rule).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  PRESENCE_COORDINATOR,
  isServiceBound,
  resolveService,
  type MemberPresence,
} from "@/domain";
import { logger } from "@/foundation/logging";
import { PRESENCE } from "@/shared/constants/system-constants";

const MODULE = "waiting-room-presence";

export interface RoomPresenceModel {
  /** Liveness by profile id. Empty while unavailable — never a guess. */
  readonly byProfileId: ReadonlyMap<string, MemberPresence>;
  /** True when a presence store is bound and the first read has landed. */
  readonly isTracking: boolean;
  readonly isRoomInactive: boolean;
  refresh(): void;
}

const EMPTY: ReadonlyMap<string, MemberPresence> = new Map();

export function useRoomPresence(
  roomId: string,
  profileId: string | null,
  enabled: boolean,
): RoomPresenceModel {
  const coordinator = useMemo(
    () => (isServiceBound(PRESENCE_COORDINATOR) ? resolveService(PRESENCE_COORDINATOR) : null),
    [],
  );
  const connectionId = useRef<string>("");
  if (connectionId.current === "") connectionId.current = crypto.randomUUID();

  const [byProfileId, setByProfileId] = useState<ReadonlyMap<string, MemberPresence>>(EMPTY);
  const [isTracking, setIsTracking] = useState(false);
  const [isRoomInactive, setIsRoomInactive] = useState(false);
  const mounted = useRef(true);

  const active = enabled && coordinator !== null && coordinator.isAvailable();

  const observe = useCallback(async () => {
    if (!coordinator || !active) return;
    try {
      const snapshot = await coordinator.observe(roomId);
      if (!mounted.current) return;
      setByProfileId(new Map(snapshot.members.map((member) => [member.profileId, member])));
      setIsRoomInactive(snapshot.isRoomInactive);
      setIsTracking(true);
    } catch (cause) {
      if (!mounted.current) return;
      // Presence is advisory: a failed read dims the indicators, it never
      // breaks the lobby.
      logger.warn("Presence read failed", { module: MODULE, roomId, error: cause });
      setIsTracking(false);
    }
  }, [active, coordinator, roomId]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!coordinator || !active || !profileId) return;
    const connection = connectionId.current;
    let stopped = false;

    const beat = () => {
      const status =
        typeof document !== "undefined" && document.visibilityState === "hidden"
          ? "idle"
          : "online";
      void coordinator
        .heartbeat({ roomId, profileId, connectionId: connection, status })
        .catch((cause: unknown) =>
          logger.warn("Heartbeat failed", { module: MODULE, roomId, error: cause }),
        );
    };

    beat();
    void observe();
    const timer = window.setInterval(() => {
      if (stopped) return;
      beat();
      void observe();
    }, PRESENCE.HEARTBEAT_INTERVAL_MS);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      void coordinator.release(roomId, profileId, connection).catch(() => undefined);
    };
  }, [active, coordinator, observe, profileId, roomId]);

  return {
    byProfileId: active ? byProfileId : EMPTY,
    isTracking: active && isTracking,
    isRoomInactive: active && isRoomInactive,
    refresh: () => void observe(),
  };
}
