/**
 * Supabase friendship adapter — Milestone F.0.
 *
 * RLS restricts every statement here to edges the caller is part of, so a
 * missing row and a forbidden row are indistinguishable — which is the correct
 * answer for a social graph.
 */
import type {
  EntityId,
  FriendshipRecord,
  FriendshipRepository,
  FriendshipStatusValue,
} from "@/repository";

import type { DataConnection } from "../connection";
import { runCommand, runMaybe, runQuery } from "../query-wrapper";
import { requireAvailable } from "../rooms/room-query-support";
import { FRIENDSHIP_COLUMNS, toFriendshipRecord, type FriendshipRow } from "./social-mapper";

const AGGREGATE = "friendships";

export function createSupabaseFriendshipRepository(
  connection: DataConnection,
): FriendshipRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  return {
    async listForProfile(profileId: EntityId): Promise<readonly FriendshipRecord[]> {
      requireAvailable(connection, context("listForProfile", profileId));
      const rows = await runQuery<FriendshipRow[]>(
        connection
          .client()
          .from("friendships")
          .select(FRIENDSHIP_COLUMNS)
          .or(`requester_profile_id.eq.${profileId},addressee_profile_id.eq.${profileId}`)
          .order("updated_at", { ascending: false }),
        context("listForProfile", profileId),
      );
      return rows.map(toFriendshipRecord);
    },

    async findBetween(profileId: EntityId, otherProfileId: EntityId) {
      requireAvailable(connection, context("findBetween", profileId));
      const rows = await runQuery<FriendshipRow[]>(
        connection
          .client()
          .from("friendships")
          .select(FRIENDSHIP_COLUMNS)
          .or(
            `and(requester_profile_id.eq.${profileId},addressee_profile_id.eq.${otherProfileId}),` +
              `and(requester_profile_id.eq.${otherProfileId},addressee_profile_id.eq.${profileId})`,
          )
          .limit(1),
        context("findBetween", profileId),
      );
      const row = rows[0];
      return row ? toFriendshipRecord(row) : null;
    },

    async findById(friendshipId: EntityId) {
      requireAvailable(connection, context("findById", friendshipId));
      const row = await runMaybe<FriendshipRow | null>(
        connection
          .client()
          .from("friendships")
          .select(FRIENDSHIP_COLUMNS)
          .eq("id", friendshipId)
          .maybeSingle(),
        context("findById", friendshipId),
      );
      return row ? toFriendshipRecord(row) : null;
    },

    async request(requesterProfileId: EntityId, addresseeProfileId: EntityId) {
      requireAvailable(connection, context("request", requesterProfileId));
      // A previously declined or cancelled edge is revived rather than
      // duplicated: the pair is unique by construction (Migration F.0).
      const row = await runQuery<FriendshipRow>(
        connection
          .client()
          .from("friendships")
          .upsert(
            {
              requester_profile_id: requesterProfileId,
              addressee_profile_id: addresseeProfileId,
              status: "pending",
              responded_at: null,
            },
            { onConflict: "requester_profile_id,addressee_profile_id" },
          )
          .select(FRIENDSHIP_COLUMNS)
          .single(),
        context("request", requesterProfileId),
      );
      return toFriendshipRecord(row);
    },

    async setStatus(
      friendshipId: EntityId,
      status: FriendshipStatusValue,
      respondedAt: string | null,
    ) {
      requireAvailable(connection, context("setStatus", friendshipId));
      const row = await runQuery<FriendshipRow>(
        connection
          .client()
          .from("friendships")
          .update({ status, responded_at: respondedAt })
          .eq("id", friendshipId)
          .select(FRIENDSHIP_COLUMNS)
          .single(),
        context("setStatus", friendshipId),
      );
      return toFriendshipRecord(row);
    },

    async remove(friendshipId: EntityId) {
      requireAvailable(connection, context("remove", friendshipId));
      await runCommand(
        connection.client().from("friendships").delete().eq("id", friendshipId),
        context("remove", friendshipId),
      );
    },
  };
}
