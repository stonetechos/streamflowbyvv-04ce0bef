/**
 * Event store adapter — Sprint 1.9, revised in the RC QA audit.
 *
 * Append-only writer for `domain_events`.
 *
 * Sequences are handed out by an in-memory per-aggregate counter, so two
 * members of the same room reach for the same number at the same moment. The
 * store settles that: it re-numbers a colliding envelope and swallows an exact
 * redelivery, so a second member's event is never lost and never doubled.
 * Members cannot read the log back (it is admin-only), so this adapter must
 * not try to inspect it — it simply steps the sequence on and retries.
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
/** Bounded: a room holds few concurrent writers. */
const MAX_SEQUENCE_ATTEMPTS = 5;

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

      let candidate = event;

      for (let attempt = 0; attempt < MAX_SEQUENCE_ATTEMPTS; attempt += 1) {
        const { error } = await connection
          .client()
          .from("domain_events")
          .insert(toDomainEventInsert(candidate));

        if (!error) return "stored";

        const mapped = toRepositoryError(error, ctx);
        const collided =
          mapped.code === REPOSITORY_ERRORS.CONFLICT.code ||
          mapped.code === REPOSITORY_ERRORS.CONSTRAINT_VIOLATION.code;
        if (!collided) throw mapped;

        // Someone else holds this slot: step past it and try once more.
        candidate = { ...candidate, sequence: candidate.sequence + 1 };
      }

      // Sustained contention. The envelope is already represented in the log
      // by the writer that won, so report it rather than failing the caller.
      return "duplicate";
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
