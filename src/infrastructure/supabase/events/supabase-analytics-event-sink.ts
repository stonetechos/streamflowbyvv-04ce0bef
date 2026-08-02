/**
 * analytics_events sink adapter — Sprint 1.9.
 *
 * Write-only. Consent was already enforced by `AnalyticsService`
 * (Foundation §14.2); the adapter never re-decides it and never enriches a
 * record with device or identity data of its own.
 */
import type { AnalyticsEventRecord, AnalyticsEventSinkRepository } from "@/repository";

import type { DataConnection } from "../connection";
import { runCommand } from "../query-wrapper";
import { requireAvailable } from "../rooms/room-query-support";
import { toAnalyticsEventInsert } from "./event-mapper";

const AGGREGATE = "analytics_event";

export function createSupabaseAnalyticsEventSink(
  connection: DataConnection,
): AnalyticsEventSinkRepository {
  return {
    async record(event: AnalyticsEventRecord): Promise<void> {
      const context = { aggregate: AGGREGATE, operation: "record" };
      requireAvailable(connection, context);
      await runCommand(
        connection.client().from("analytics_events").insert(toAnalyticsEventInsert(event)),
        context,
      );
    },
  };
}
