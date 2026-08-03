/**
 * Room realtime hub — Milestone D.5.
 *
 * Exactly one realtime subscription per room, shared by every lobby hook.
 *
 * Before this hub each hook opened its own channel through the read model, so
 * a single room held three subscriptions on the identical transport topic and
 * one broadcast produced three independent database reloads. The hub keeps the
 * Domain boundary unchanged — it still subscribes through `RoomReadModel` —
 * but it reference-counts the subscription and coalesces notices so a burst of
 * broadcasts wakes every consumer exactly once.
 *
 * No behaviour is decided here: a notice still means "re-read", never "trust
 * this payload" (Foundation §4).
 */
import { ROOM_READ_MODEL, isServiceBound, resolveService, type RoomRealtimeNotice } from "@/domain";
import { logger } from "@/foundation/logging";

const MODULE = "waiting-room-realtime-hub";

/**
 * How long a notice waits for company before the room is woken. Long enough to
 * fold the burst a single mutation produces, short enough to stay live.
 */
const COALESCE_WINDOW_MS = 120;

export type RoomRealtimeListener = (notice: RoomRealtimeNotice) => void;
export type RoomLiveListener = (isLive: boolean) => void;

interface RoomChannel {
  readonly listeners: Set<RoomRealtimeListener>;
  readonly liveListeners: Set<RoomLiveListener>;
  detach: (() => void) | null;
  disposed: boolean;
  isLive: boolean;
  pending: RoomRealtimeNotice | null;
  timer: ReturnType<typeof setTimeout> | null;
}

const channels = new Map<string, RoomChannel>();

function flush(roomId: string, channel: RoomChannel): void {
  channel.timer = null;
  const notice = channel.pending;
  channel.pending = null;
  if (!notice) return;
  for (const listener of [...channel.listeners]) {
    try {
      listener(notice);
    } catch (cause) {
      logger.warn("Room realtime listener failed", { module: MODULE, roomId, error: cause });
    }
  }
}

function announceLive(channel: RoomChannel, isLive: boolean): void {
  channel.isLive = isLive;
  for (const listener of [...channel.liveListeners]) listener(isLive);
}

function openChannel(roomId: string): RoomChannel {
  const channel: RoomChannel = {
    listeners: new Set(),
    liveListeners: new Set(),
    detach: null,
    disposed: false,
    isLive: false,
    pending: null,
    timer: null,
  };
  channels.set(roomId, channel);

  if (!isServiceBound(ROOM_READ_MODEL)) return channel;

  void resolveService(ROOM_READ_MODEL)
    .subscribeToRoom(roomId, (notice) => {
      if (channel.disposed) return;
      // Coalesce: keep the newest notice and wake the room once.
      channel.pending = notice;
      if (channel.timer !== null) return;
      channel.timer = setTimeout(() => flush(roomId, channel), COALESCE_WINDOW_MS);
    })
    .then((unsubscribe) => {
      if (channel.disposed) {
        unsubscribe();
        return;
      }
      channel.detach = unsubscribe;
      announceLive(channel, true);
    })
    .catch((cause: unknown) => {
      logger.warn("Room realtime subscribe failed", { module: MODULE, roomId, error: cause });
    });

  return channel;
}

function closeChannel(roomId: string, channel: RoomChannel): void {
  channel.disposed = true;
  if (channel.timer !== null) {
    clearTimeout(channel.timer);
    channel.timer = null;
  }
  channel.pending = null;
  channel.detach?.();
  channel.detach = null;
  channels.delete(roomId);
}

/**
 * Attaches a consumer to the room's single subscription, opening it on the
 * first consumer and releasing it after the last one leaves.
 */
export function attachRoomRealtime(
  roomId: string,
  onNotice: RoomRealtimeListener,
  onLive?: RoomLiveListener,
): () => void {
  const channel = channels.get(roomId) ?? openChannel(roomId);
  channel.listeners.add(onNotice);
  if (onLive) {
    channel.liveListeners.add(onLive);
    onLive(channel.isLive);
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    channel.listeners.delete(onNotice);
    if (onLive) {
      channel.liveListeners.delete(onLive);
      onLive(false);
    }
    if (channel.listeners.size === 0 && channel.liveListeners.size === 0) {
      closeChannel(roomId, channel);
    }
  };
}

/** True while the room holds an attached transport. Diagnostics only. */
export function isRoomLive(roomId: string): boolean {
  return channels.get(roomId)?.isLive ?? false;
}
