/**
 * recent_partners projection adapter — Sprint 1.9.
 *
 * Upsert semantics: first observation inserts the pairing, later ones advance
 * `last_watched_at` and increment the session count. A replayed observation
 * for an instant already recorded is ignored, so the count stays truthful.
 */
import type { PartnerObservation, RecentPartnersProjection } from "@/repository";

import type { DataConnection } from "../connection";
import { runCommand, runMaybe } from "../query-wrapper";
import { requireAvailable } from "../rooms/room-query-support";
import { RECENT_PARTNER_COLUMNS, toRecentPartnerInsert, type RecentPartnerRow } from "./event-mapper";

const AGGREGATE = "recent_partner";

export function createSupabaseRecentPartnersProjection(
  connection: DataConnection,
): RecentPartnersProjection {
  return {
    async touch(observation: PartnerObservation): Promise<void> {
      const context = {
        aggregate: AGGREGATE,
        operation: "touch",
        entityId: observation.profileId,
      };
      requireAvailable(connection, context);

      const table = () => connection.client().from("recent_partners");

      const existing = await runMaybe<RecentPartnerRow>(
        table()
          .select(RECENT_PARTNER_COLUMNS)
          .eq("profile_id", observation.profileId)
          .eq("partner_profile_id", observation.partnerProfileId)
          .maybeSingle(),
        context,
      );

      if (!existing) {
        await runCommand(table().insert(toRecentPartnerInsert(observation)), context);
        return;
      }

      // Replay of an already-counted session: nothing to advance.
      if (existing.last_watched_at >= observation.watchedAt) return;

      await runCommand(
        table()
          .update({
            session_count: existing.session_count + 1,
            last_watched_at: observation.watchedAt,
          })
          .eq("id", existing.id),
        context,
      );
    },
  };
}
