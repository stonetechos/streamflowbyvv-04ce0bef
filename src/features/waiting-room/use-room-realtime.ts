/**
 * Shared room realtime hook — Milestone D.5.
 *
 * The React face of `room-realtime-hub`. Every lobby hook that used to open
 * its own subscription now calls this instead, so a room holds exactly one
 * channel and one coalesced wake-up regardless of how many hooks listen.
 *
 * The callback is held in a ref so a caller does not have to memoize it: the
 * subscription depends on the room and nothing else.
 */
import { useEffect, useRef, useState } from "react";

import type { RoomRealtimeNotice } from "@/domain";

import { attachRoomRealtime } from "./room-realtime-hub";

export interface RoomRealtimeModel {
  /** True once a transport is attached for this room. */
  readonly isLive: boolean;
}

export function useRoomRealtime(
  roomId: string,
  enabled: boolean,
  onNotice: (notice: RoomRealtimeNotice) => void,
): RoomRealtimeModel {
  const [isLive, setIsLive] = useState(false);
  const listener = useRef(onNotice);
  listener.current = onNotice;

  useEffect(() => {
    if (!enabled) {
      setIsLive(false);
      return;
    }
    return attachRoomRealtime(
      roomId,
      (notice) => listener.current(notice),
      (live) => setIsLive(live),
    );
  }, [enabled, roomId]);

  return { isLive };
}
