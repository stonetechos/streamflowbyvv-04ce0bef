/**
 * RoomMemberRepository adapter — Sprint 1.7.
 *
 * Membership persistence only. Capacity (ADR-013) and role rules are enforced
 * by `RoomService`; `countByRoom` exists so Domain can be given the number it
 * needs without reaching into storage itself.
 */
import type { RoomMember, RoomMemberDraft, RoomMemberPatch } from "@/domain/rooms/room.types";
import type { MembershipState } from "@/domain/shared/domain-enums";
import type {
  RoomMemberQuery,
  RoomMemberRepository,
} from "@/repository/rooms/room-repository.types";
import type { EntityId, Page } from "@/repository/repository.types";

import type { DataConnection } from "../connection";
import { runCommand, runCountedQuery, runMaybe, runQuery } from "../query-wrapper";
import { paginateRows, requireAvailable } from "./room-query-support";
import {
  ROOM_MEMBER_COLUMNS,
  toRoomMember,
  toRoomMemberInsert,
  toRoomMemberUpdate,
  type RoomMemberRow,
} from "./room-mapper";

const AGGREGATE = "room_member";

export function createSupabaseRoomMemberRepository(
  connection: DataConnection,
): RoomMemberRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  const table = () => connection.client().from("room_members");

  return {
    async findById(id: EntityId): Promise<RoomMember | null> {
      requireAvailable(connection, context("findById", id));
      const row = await runMaybe<RoomMemberRow>(
        table().select(ROOM_MEMBER_COLUMNS).eq("id", id).maybeSingle(),
        context("findById", id),
      );
      return row ? toRoomMember(row) : null;
    },

    async findByRoomAndProfile(roomId: EntityId, profileId: EntityId): Promise<RoomMember | null> {
      requireAvailable(connection, context("findByRoomAndProfile", roomId));
      const row = await runMaybe<RoomMemberRow>(
        table()
          .select(ROOM_MEMBER_COLUMNS)
          .eq("room_id", roomId)
          .eq("profile_id", profileId)
          .maybeSingle(),
        context("findByRoomAndProfile", roomId),
      );
      return row ? toRoomMember(row) : null;
    },

    async listByRoom(roomId: EntityId, query?: RoomMemberQuery): Promise<Page<RoomMember>> {
      requireAvailable(connection, context("listByRoom", roomId));
      let builder = table().select(ROOM_MEMBER_COLUMNS, { count: "exact" }).eq("room_id", roomId);
      if (query?.states?.length) builder = builder.in("state", [...query.states]);

      return paginateRows<RoomMemberRow, RoomMember>({
        builder,
        query,
        toEntity: toRoomMember,
        context: context("listByRoom", roomId),
      });
    },

    async countByRoom(roomId: EntityId, states?: readonly MembershipState[]): Promise<number> {
      requireAvailable(connection, context("countByRoom", roomId));
      let builder = table().select("id", { count: "exact", head: true }).eq("room_id", roomId);
      if (states?.length) builder = builder.in("state", [...states]);

      const { total } = await runCountedQuery<{ id: string }>(
        builder,
        context("countByRoom", roomId),
      );
      return total;
    },

    async create(draft: RoomMemberDraft): Promise<RoomMember> {
      requireAvailable(connection, context("create", draft.roomId));
      const row = await runQuery<RoomMemberRow>(
        table().insert(toRoomMemberInsert(draft)).select(ROOM_MEMBER_COLUMNS).single(),
        context("create", draft.roomId),
      );
      return toRoomMember(row);
    },

    async update(id: EntityId, patch: RoomMemberPatch): Promise<RoomMember> {
      requireAvailable(connection, context("update", id));
      const row = await runQuery<RoomMemberRow>(
        table().update(toRoomMemberUpdate(patch)).eq("id", id).select(ROOM_MEMBER_COLUMNS).single(),
        context("update", id),
      );
      return toRoomMember(row);
    },

    async remove(id: EntityId): Promise<void> {
      requireAvailable(connection, context("remove", id));
      await runCommand(table().delete().eq("id", id), context("remove", id));
    },
  };
}
