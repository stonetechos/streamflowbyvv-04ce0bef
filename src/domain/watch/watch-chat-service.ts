/**
 * Watch chat service — Sprint H1.
 *
 * The one place a chat line is validated before it becomes durable. Storage
 * enforces the same bounds; this states them in Domain terms so the surface
 * can refuse before it writes.
 */
import { createServiceToken } from "@/domain/service-registry";
import {
  ROOM_CHAT_REPOSITORY,
  isRepositoryBound,
  resolveRepository,
  type EntityId,
  type RoomChatRepository,
  type RoomMessage,
} from "@/repository";

export type { RoomMessage } from "@/repository";

export const CHAT_MESSAGE_MAX_LENGTH = 500;
const DEFAULT_PAGE = 100;

export type ChatRejection = "empty" | "too_long";

export interface WatchChatService {
  isAvailable(): boolean;
  /** Null when acceptable, otherwise why the line was refused. */
  validate(body: string): ChatRejection | null;
  history(roomId: EntityId, limit?: number): Promise<readonly RoomMessage[]>;
  send(roomId: EntityId, profileId: EntityId, body: string): Promise<RoomMessage>;
  /**
   * Sprint H5 — a durable, room-scoped coordination event. It travels the same
   * channel as chat because it is addressed to people, not to players: the
   * body is the human-readable line, the metadata is what the room parses.
   */
  sendEvent(
    roomId: EntityId,
    profileId: EntityId,
    body: string,
    metadata: Readonly<Record<string, unknown>>,
  ): Promise<RoomMessage>;
  subscribe(roomId: EntityId, listener: (message: RoomMessage) => void): Promise<() => void>;
}

export interface WatchChatDependencies {
  readonly chat: RoomChatRepository | null;
}

export function resolveWatchChatDependencies(): WatchChatDependencies {
  return {
    chat: isRepositoryBound(ROOM_CHAT_REPOSITORY) ? resolveRepository(ROOM_CHAT_REPOSITORY) : null,
  };
}

export function createWatchChatService(deps: WatchChatDependencies): WatchChatService {
  const { chat } = deps;

  return {
    isAvailable: () => chat !== null,

    validate(body) {
      const trimmed = body.trim();
      if (trimmed.length === 0) return "empty";
      if (trimmed.length > CHAT_MESSAGE_MAX_LENGTH) return "too_long";
      return null;
    },

    async history(roomId, limit = DEFAULT_PAGE) {
      if (!chat) return [];
      return chat.listRecent(roomId, limit);
    },

    async send(roomId, profileId, body) {
      if (!chat) throw new Error("SF-SYS-PERSISTENCE-UNAVAILABLE");
      const trimmed = body.trim();
      if (trimmed.length === 0 || trimmed.length > CHAT_MESSAGE_MAX_LENGTH) {
        throw new Error("SF-CHAT-INVALID");
      }
      return chat.send({ roomId, profileId, body: trimmed });
    },

    async sendEvent(roomId, profileId, body, metadata) {
      if (!chat) throw new Error("SF-SYS-PERSISTENCE-UNAVAILABLE");
      const trimmed = body.trim().slice(0, CHAT_MESSAGE_MAX_LENGTH);
      if (trimmed.length === 0) throw new Error("SF-CHAT-INVALID");
      return chat.send({ roomId, profileId, body: trimmed, metadata });
    },

    async subscribe(roomId, listener) {
      if (!chat) return () => {};
      return chat.subscribe(roomId, listener);
    },
  };
}

export const WATCH_CHAT_SERVICE = createServiceToken<WatchChatService>("WatchChatService");
