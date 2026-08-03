/**
 * Supabase recent-partners read adapter — Milestone F.0.
 *
 * The write side of this projection already exists (Sprint 1.9). Milestone F.0
 * only adds the read the "watched together recently" rail needs; nothing here
 * decides who a partner is.
 */
import type { EntityId, RecentPartnerReadRepository, RecentPartnerRecord } from "@/repository";

import type { DataConnection } from "../connection";
import { runQuery } from "../query-wrapper";
import { requireAvailable } from "../rooms/room-query-support";
import { toRecentPartnerRecord, type RecentPartnerRow } from "./social-mapper";

const AGGREGATE = "recent_partners";

export function createSupabaseRecentPartnerReadRepository(
  connection: DataConnection,
): RecentPartnerReadRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  return {
    async listForProfile(
      profileId: EntityId,
      limit: number,
    ): Promise<readonly RecentPartnerRecord[]> {
      requireAvailable(connection, context("listForProfile", profileId));
      const rows = await runQuery<RecentPartnerRow[]>(
        connection
          .client()
          .from("recent_partners")
          .select("partner_profile_id, last_watched_at, session_count")
          .eq("profile_id", profileId)
          .order("last_watched_at", { ascending: false })
          .limit(limit),
        context("listForProfile", profileId),
      );
      return rows.map(toRecentPartnerRecord);
    },
  };
}
