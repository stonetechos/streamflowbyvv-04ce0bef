/**
 * RoomStateRepository adapter — Sprint 1.7.
 *
 * Implements optimistic concurrency on `room_state.version` (Database Spec
 * §3.2, ADR-004). Every update is a compare-and-set: the WHERE clause carries
 * the version the caller read, so two concurrent writers cannot both succeed
 * and the loser is told rather than silently overwritten. The database trigger
 * `enforce_room_state_version` remains the backstop.
 */
import type { RoomState, RoomStateDraft, RoomStatePatch } from "@/domain/rooms/room.types";
import { REPOSITORY_ERRORS, RepositoryError } from "@/repository";
import type {
  RoomStateConcurrencyInfo,
  RoomStateRepository,
} from "@/repository/rooms/room-repository.types";
import type { EntityId } from "@/repository/repository.types";

import type { DataConnection } from "../connection";
import { runMaybe, runQuery } from "../query-wrapper";
import { requireAvailable } from "./room-query-support";
import {
  ROOM_STATE_COLUMNS,
  toRoomState,
  toRoomStateInsert,
  toRoomStateUpdate,
  type RoomStateRow,
} from "./room-mapper";

const AGGREGATE = "room_state";

export function createSupabaseRoomStateRepository(
  connection: DataConnection,
): RoomStateRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  const table = () => connection.client().from("room_state");

  async function readState(roomId: EntityId, operation: string): Promise<RoomState | null> {
    const row = await runMaybe<RoomStateRow>(
      table().select(ROOM_STATE_COLUMNS).eq("room_id", roomId).maybeSingle(),
      context(operation, roomId),
    );
    return row ? toRoomState(row) : null;
  }

  const repository: RoomStateRepository = {
    findByRoomId: async (roomId) => {
      requireAvailable(connection, context("findByRoomId", roomId));
      return readState(roomId, "findByRoomId");
    },

    async create(draft: RoomStateDraft): Promise<RoomState> {
      requireAvailable(connection, context("create", draft.roomId));
      const row = await runQuery<RoomStateRow>(
        table().insert(toRoomStateInsert(draft)).select(ROOM_STATE_COLUMNS).single(),
        context("create", draft.roomId),
      );
      return toRoomState(row);
    },

    async tryUpdate(roomId: EntityId, expectedVersion: number, patch: RoomStatePatch) {
      requireAvailable(connection, context("tryUpdate", roomId));

      // Compare-and-set: `eq("version", expectedVersion)` makes the write a
      // no-op for a stale caller instead of a last-writer-wins overwrite.
      const row = await runMaybe<RoomStateRow>(
        table()
          .update(toRoomStateUpdate(patch, expectedVersion + 1))
          .eq("room_id", roomId)
          .eq("version", expectedVersion)
          .select(ROOM_STATE_COLUMNS)
          .maybeSingle(),
        context("tryUpdate", roomId),
      );

      if (row) return { outcome: "applied" as const, state: toRoomState(row) };

      const current = await readState(roomId, "tryUpdate:reread");
      const conflict: RoomStateConcurrencyInfo = {
        roomId,
        expectedVersion,
        actualVersion: current?.version ?? null,
      };
      return { outcome: "conflict" as const, conflict };
    },

    async update(roomId: EntityId, expectedVersion: number, patch: RoomStatePatch) {
      const result = await repository.tryUpdate(roomId, expectedVersion, patch);
      if (result.outcome === "applied") return result.state;

      // A missing row is genuinely absent, not a losing race.
      const descriptor =
        result.conflict.actualVersion === null
          ? REPOSITORY_ERRORS.NOT_FOUND
          : REPOSITORY_ERRORS.CONFLICT;
      throw new RepositoryError(descriptor, context("update", roomId));
    },
  };

  return repository;
}
