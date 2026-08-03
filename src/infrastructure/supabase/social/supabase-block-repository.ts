/**
 * Supabase block-list adapter — Milestone F.0, ADR-011.
 *
 * The block list is the one social read that must never be softened: a blocked
 * person disappears from search and from every roster, enforced in the store
 * by `is_block_between` rather than trusted to the client.
 */
import type { BlockRecord, BlockRepository, EntityId } from "@/repository";

import type { DataConnection } from "../connection";
import { runCommand, runQuery } from "../query-wrapper";
import { requireAvailable } from "../rooms/room-query-support";
import { toBlockRecord, type BlockRow } from "./social-mapper";

const AGGREGATE = "blocked_users";
const BLOCK_COLUMNS = "id, profile_id, blocked_profile_id, reason, created_at";

export function createSupabaseBlockRepository(connection: DataConnection): BlockRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  return {
    async listForProfile(profileId: EntityId): Promise<readonly BlockRecord[]> {
      requireAvailable(connection, context("listForProfile", profileId));
      const rows = await runQuery<BlockRow[]>(
        connection
          .client()
          .from("blocked_users")
          .select(BLOCK_COLUMNS)
          .eq("profile_id", profileId)
          .order("created_at", { ascending: false }),
        context("listForProfile", profileId),
      );
      return rows.map(toBlockRecord);
    },

    async block(profileId: EntityId, blockedProfileId: EntityId, reason: string | null) {
      requireAvailable(connection, context("block", profileId));
      await runCommand(
        connection.client().from("blocked_users").insert({
          profile_id: profileId,
          blocked_profile_id: blockedProfileId,
          reason,
        }),
        context("block", profileId),
      );
    },

    async unblock(profileId: EntityId, blockedProfileId: EntityId) {
      requireAvailable(connection, context("unblock", profileId));
      await runCommand(
        connection
          .client()
          .from("blocked_users")
          .delete()
          .eq("profile_id", profileId)
          .eq("blocked_profile_id", blockedProfileId),
        context("unblock", profileId),
      );
    },
  };
}
