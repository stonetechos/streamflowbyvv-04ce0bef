/**
 * Watch-party persistence contracts — Sprint H1.
 *
 * Two seams the theater surface needs and the Sprint 1.7 cluster did not
 * cover: durable room chat, and a live notice whenever the authoritative
 * playback row for a room changes.
 *
 * Vendor-neutral by construction: no table, column, driver, or channel name
 * appears here (Foundation §5).
 */
import { createRepositoryToken, type RepositoryToken } from "@/repository/repository-registry";
import type { EntityId } from "@/repository/repository.types";

/** A durable chat line inside a room. */
export interface RoomMessage {
  readonly id: string;
  readonly roomId: EntityId;
  readonly profileId: EntityId;
  readonly body: string;
  /** Opaque bag. Sprint H5 carries coordination events here. */
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export interface RoomMessageDraft {
  readonly roomId: EntityId;
  readonly profileId: EntityId;
  readonly body: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type RoomMessageUnsubscribe = () => void;

export interface RoomChatRepository {
  /** Oldest-first page of the most recent `limit` messages. */
  listRecent(roomId: EntityId, limit: number): Promise<readonly RoomMessage[]>;
  send(draft: RoomMessageDraft): Promise<RoomMessage>;
  /** Live arrivals. Resolves to a detach function; no-op when unsupported. */
  subscribe(
    roomId: EntityId,
    listener: (message: RoomMessage) => void,
  ): Promise<RoomMessageUnsubscribe>;
}

/**
 * "The authoritative playback row for this room moved." The payload is
 * deliberately absent: a notice means re-read, never trust (Foundation §4).
 */
export interface RoomStateWatcher {
  subscribe(roomId: EntityId, listener: () => void): Promise<RoomMessageUnsubscribe>;
}

export const ROOM_CHAT_REPOSITORY: RepositoryToken<RoomChatRepository> =
  createRepositoryToken<RoomChatRepository>("RoomChatRepository");

export const ROOM_STATE_WATCHER: RepositoryToken<RoomStateWatcher> =
  createRepositoryToken<RoomStateWatcher>("RoomStateWatcher");
