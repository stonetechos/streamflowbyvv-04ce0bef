/**
 * activity_timeline projection adapter — Sprint 1.9.
 *
 * Idempotency is by content: an entry that already exists for the same
 * profile, activity, room, and instant is not written twice, so a replayed
 * event leaves the read model unchanged.
 */
import type { ActivityTimelineEntry, ActivityTimelineProjection } from "@/repository";

import type { DataConnection } from "../connection";
import { runCommand, runMaybe } from "../query-wrapper";
import { requireAvailable } from "../rooms/room-query-support";
import { toActivityTimelineInsert } from "./event-mapper";

const AGGREGATE = "activity_timeline";

export function createSupabaseActivityTimelineProjection(
  connection: DataConnection,
): ActivityTimelineProjection {
  return {
    async record(entry: ActivityTimelineEntry): Promise<void> {
      const context = {
        aggregate: AGGREGATE,
        operation: "record",
        entityId: entry.profileId,
      };
      requireAvailable(connection, context);

      const existing = await runMaybe<{ id: string }>(
        connection
          .client()
          .from("activity_timeline")
          .select("id")
          .eq("profile_id", entry.profileId)
          .eq("activity_type", entry.activityType)
          .eq("occurred_at", entry.occurredAt)
          .limit(1)
          .maybeSingle(),
        context,
      );
      if (existing) return;

      await runCommand(
        connection.client().from("activity_timeline").insert(toActivityTimelineInsert(entry)),
        context,
      );
    },
  };
}
