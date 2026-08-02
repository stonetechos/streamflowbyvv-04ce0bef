/**
 * RoomRepository adapter — Sprint 1.7.
 *
 * Persistence only. Lifecycle validity, capacity, and authorization are Domain
 * concerns (Sprint 1.6) and are deliberately not re-checked here.
 */
import type { Room, RoomDraft, RoomPatch } from "@/domain/rooms/room.types";
import type { RoomQuery, RoomRepository } from "@/repository/rooms/room-repository.types";
import type { EntityCode, EntityId, Page } from "@/repository/repository.types";

import type { DataConnection } from "../connection";
import { runCommand, runMaybe, runQuery } from "../query-wrapper";
import { paginateRows, requireAvailable } from "./room-query-support";
import {
  ROOM_COLUMNS,
  toRoom,
  toRoomInsert,
  toRoomUpdate,
  type RoomRow,
} from "./room-mapper";

const AGGREGATE = "room";

export function createSupabaseRoomRepository(connection: DataConnection): RoomRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  const table = () => connection.client().from("rooms");

  return {
    async findById(id: EntityId): Promise<Room | null> {
      requireAvailable(connection, context("findById", id));
      const row = await runMaybe<RoomRow>(
        table().select(ROOM_COLUMNS).eq("id", id).is("deleted_at", null).maybeSingle(),
        context("findById", id),
      );
      return row ? toRoom(row) : null;
    },

    async findByCode(code: EntityCode): Promise<Room | null> {
      requireAvailable(connection, context("findByCode"));
      const row = await runMaybe<RoomRow>(
        table().select(ROOM_COLUMNS).eq("code", code).is("deleted_at", null).maybeSingle(),
        context("findByCode"),
      );
      return row ? toRoom(row) : null;
    },

    async list(query?: RoomQuery): Promise<Page<Room>> {
      requireAvailable(connection, context("list"));
      let builder = table().select(ROOM_COLUMNS, { count: "exact" });

      if (query?.hostProfileId) builder = builder.eq("host_profile_id", query.hostProfileId);
      if (query?.statuses?.length) builder = builder.in("status", [...query.statuses]);
      if (query?.memberProfileId) {
        // Membership is a separate aggregate; resolve ids first so this stays a
        // plain filter rather than an adapter-specific join.
        const memberRows = await runQuery<{ room_id: string }[]>(
          connection
            .client()
            .from("room_members")
            .select("room_id")
            .eq("profile_id", query.memberProfileId)
            .in("state", ["invited", "joined"]),
          context("list:membership"),
        );
        const roomIds = memberRows.map((row) => row.room_id);
        if (roomIds.length === 0) {
          const limit = query.page?.limit ?? 50;
          const offset = query.page?.offset ?? 0;
          return { items: [], total: 0, limit, offset, hasMore: false };
        }
        builder = builder.in("id", roomIds);
      }

      return paginateRows<RoomRow, Room>({
        builder,
        query,
        toEntity: toRoom,
        softDeleteColumn: "deleted_at",
        context: context("list"),
      });
    },

    async create(draft: RoomDraft): Promise<Room> {
      requireAvailable(connection, context("create"));
      const row = await runQuery<RoomRow>(
        table().insert(toRoomInsert(draft)).select(ROOM_COLUMNS).single(),
        context("create"),
      );
      return toRoom(row);
    },

    async update(id: EntityId, patch: RoomPatch): Promise<Room> {
      requireAvailable(connection, context("update", id));
      const row = await runQuery<RoomRow>(
        table()
          .update(toRoomUpdate(patch))
          .eq("id", id)
          .is("deleted_at", null)
          .select(ROOM_COLUMNS)
          .single(),
        context("update", id),
      );
      return toRoom(row);
    },

    async remove(id: EntityId): Promise<void> {
      requireAvailable(connection, context("remove", id));
      await runCommand(
        table().update({ deleted_at: new Date().toISOString() }).eq("id", id),
        context("remove", id),
      );
    },
  };
}
