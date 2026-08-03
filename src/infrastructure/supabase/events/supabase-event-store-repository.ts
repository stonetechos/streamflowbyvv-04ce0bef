/**
 * Event store adapter — Sprint 1.9.
 *
 * Append-only writer for `domain_events`. Replay safety is enforced by the
 * store: the unique (aggregate_type, aggregate_id, event_name, sequence)
 * index turns a duplicate append into a reported no-op instead of a second
 * row, so redelivery after a reconnect is harmless.
 */
import {
  REPOSITORY_ERRORS,
  type EventAppendResult,
  type EventStoreRepository,
  type StoredDomainEvent,
} from "@/repository";

import type { DataConnection } from "../connection";
import { toRepositoryError } from "../error-mapping";
import { requireAvailable } from "../rooms/room-query-support";
import { runMaybe } from "../query-wrapper";
import { toDomainEventInsert } from "./event-mapper";

const AGGREGATE = "domain_event";

export function createSupabaseEventStoreRepository(
  connection: DataConnection,
): EventStoreRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  return {
    async append(event: StoredDomainEvent): Promise<EventAppendResult> {
      const ctx = context("append", event.aggregateId);
      requireAvailable(connection, ctx);

      const { error } = await connection
        .client()
        .from("domain_events")
        .insert(toDomainEventInsert(event));

      if (!error) return "stored";

      const mapped = toRepositoryError(error, ctx);
      // A unique-index hit means the envelope is already durable.
      if (
        mapped.code === REPOSITORY_ERRORS.CONFLICT.code ||
        mapped.code === REPOSITORY_ERRORS.CONSTRAINT_VIOLATION.code
      ) {
        return "duplicate";
      }
      throw mapped;
    },

    async latestSequence(aggregateType: string, aggregateId: string): Promise<number> {
      const ctx = context("latestSequence", aggregateId);
      requireAvailable(connection, ctx);

      const row = await runMaybe<{ sequence: number | null }>(
        connection
          .client()
          .from("domain_events")
          .select("sequence")
          .eq("aggregate_type", aggregateType)
          .eq("aggregate_id", aggregateId)
          .order("sequence", { ascending: false })
          .limit(1)
          .maybeSingle(),
        ctx,
      );
      return row?.sequence ?? 0;
    },
  };
}
