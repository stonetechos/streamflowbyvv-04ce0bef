/**
 * Room presence persistence contract — Sprint 2.1, Foundation §5.
 *
 * Neutral by construction: no table, column, upsert syntax, or driver type.
 * The contract is intentionally tiny — presence is written by a heartbeat and
 * read as a list; the staleness rule that turns a row into "offline" lives in
 * `PresenceService` (Sprint 1.6), not here.
 */
import type { PresenceHeartbeat, RoomPresence } from "@/domain/rooms/presence.types";
import { createRepositoryToken, type RepositoryToken } from "@/repository/repository-registry";
import type { EntityId } from "@/repository/repository.types";

export interface RoomPresenceRepository {
  /** Upserts the heartbeat for one (room, profile, connection) triple. */
  heartbeat(beat: PresenceHeartbeat): Promise<RoomPresence>;
  /** Every live connection recorded for the room, newest heartbeat first. */
  listByRoom(roomId: EntityId): Promise<readonly RoomPresence[]>;
  /** Removes the caller's own connection row on a clean exit. Best-effort. */
  release(roomId: EntityId, profileId: EntityId, connectionId: string): Promise<void>;
}

export const ROOM_PRESENCE_REPOSITORY: RepositoryToken<RoomPresenceRepository> =
  createRepositoryToken<RoomPresenceRepository>("RoomPresenceRepository");
