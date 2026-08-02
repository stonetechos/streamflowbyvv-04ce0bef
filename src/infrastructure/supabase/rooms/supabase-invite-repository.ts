/**
 * InviteRepository adapter — Sprint 1.7, ADR-006.
 *
 * Persistence only: expiry evaluation, revocation rules, and rate limits are
 * `InvitationService` concerns (Sprint 1.6). The delivery token is stored
 * hashed by the schema and is never selected, returned, or logged here
 * (Foundation §10).
 */
import type { Invite, InviteDraft, InvitePatch } from "@/domain/rooms/room.types";
import type { InviteQuery, InviteRepository } from "@/repository/rooms/room-repository.types";
import type { EntityCode, EntityId, Page } from "@/repository/repository.types";

import type { DataConnection } from "../connection";
import { runCommand, runMaybe, runQuery } from "../query-wrapper";
import { paginateRows, requireAvailable } from "./room-query-support";
import {
  INVITE_COLUMNS,
  toInvite,
  toInviteInsert,
  toInviteUpdate,
  type InviteRow,
} from "./room-mapper";

const AGGREGATE = "invite";

export function createSupabaseInviteRepository(connection: DataConnection): InviteRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  const table = () => connection.client().from("invites");

  return {
    async findById(id: EntityId): Promise<Invite | null> {
      requireAvailable(connection, context("findById", id));
      const row = await runMaybe<InviteRow>(
        table().select(INVITE_COLUMNS).eq("id", id).is("deleted_at", null).maybeSingle(),
        context("findById", id),
      );
      return row ? toInvite(row) : null;
    },

    async findByCode(code: EntityCode): Promise<Invite | null> {
      requireAvailable(connection, context("findByCode"));
      const row = await runMaybe<InviteRow>(
        table().select(INVITE_COLUMNS).eq("code", code).is("deleted_at", null).maybeSingle(),
        context("findByCode"),
      );
      return row ? toInvite(row) : null;
    },

    async listByRoom(roomId: EntityId, query?: InviteQuery): Promise<Page<Invite>> {
      requireAvailable(connection, context("listByRoom", roomId));
      let builder = table().select(INVITE_COLUMNS, { count: "exact" }).eq("room_id", roomId);
      if (query?.statuses?.length) builder = builder.in("status", [...query.statuses]);

      return paginateRows<InviteRow, Invite>({
        builder,
        query,
        toEntity: toInvite,
        softDeleteColumn: "deleted_at",
        context: context("listByRoom", roomId),
      });
    },

    async listForInvitee(profileId: EntityId, query?: InviteQuery): Promise<Page<Invite>> {
      requireAvailable(connection, context("listForInvitee", profileId));
      let builder = table()
        .select(INVITE_COLUMNS, { count: "exact" })
        .eq("invitee_profile_id", profileId);
      if (query?.statuses?.length) builder = builder.in("status", [...query.statuses]);

      return paginateRows<InviteRow, Invite>({
        builder,
        query,
        toEntity: toInvite,
        softDeleteColumn: "deleted_at",
        context: context("listForInvitee", profileId),
      });
    },

    async create(draft: InviteDraft): Promise<Invite> {
      requireAvailable(connection, context("create", draft.roomId));
      const row = await runQuery<InviteRow>(
        table().insert(toInviteInsert(draft)).select(INVITE_COLUMNS).single(),
        context("create", draft.roomId),
      );
      return toInvite(row);
    },

    async update(id: EntityId, patch: InvitePatch): Promise<Invite> {
      requireAvailable(connection, context("update", id));
      const row = await runQuery<InviteRow>(
        table()
          .update(toInviteUpdate(patch))
          .eq("id", id)
          .is("deleted_at", null)
          .select(INVITE_COLUMNS)
          .single(),
        context("update", id),
      );
      return toInvite(row);
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
