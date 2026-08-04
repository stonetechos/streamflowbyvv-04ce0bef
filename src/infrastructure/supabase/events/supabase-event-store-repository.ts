/**
 * Event store adapter — Sprint 1.9, revised in the RC QA audit.
 *
 * Append-only writer for `domain_events`. Replay safety is enforced by the
 * store: the unique (aggregate_type, aggregate_id, event_name, sequence)
 * index turns a redelivered envelope into a reported no-op.
 *
 * Sequences are handed out by an in-memory per-aggregate counter, so two
 * members of the same room can reach for the same number at the same moment.
 * That collision is NOT a replay — the two envelopes differ — so the adapter
 * re-reads the stored row, and when it is a different envelope it appends
 * again after the highest sequence the store actually holds. Without this the
 * second member's event was quietly discarded.
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
/** Bounded: a room holds few concurrent writers, and each retry re-reads. */
const MAX_SEQUENCE_ATTEMPTS = 5;

export function createSupabaseEventStoreRepository(
  connection: DataConnection,
): EventStoreRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  /** Highest sequence stored for an aggregate, regardless of event name. */
  async function highestSequence(event: StoredDomainEvent, ctx: ReturnType<typeof context>) {
    const row = await runMaybe<{ sequence: number | null }>(
      connection
        .client()
        .from("domain_events")
        .select("sequence")
        .eq("aggregate_type", event.aggregateType)
        .eq("aggregate_id", event.aggregateId)
        .order("sequence", { ascending: false })
        .limit(1)
        .maybeSingle(),
      ctx,
    );
    return row?.sequence ?? 0;
  }

  /** True when the row already at this slot is this very envelope. */
  async function isSameEnvelope(event: StoredDomainEvent, ctx: ReturnType<typeof context>) {
    const row = await runMaybe<{ correlation_id: string | null; occurred_at: string }>(
      connection
        .client()
        .from("domain_events")
        .select("correlation_id, occurred_at")
        .eq("aggregate_type", event.aggregateType)
        .eq("aggregate_id", event.aggregateId)
        .eq("event_name", event.eventName)
        .eq("sequence", event.sequence)
        .maybeSingle(),
      ctx,
    );
    if (!row) return false;
    return (
      row.correlation_id === event.correlationId &&
      new Date(row.occurred_at).getTime() === new Date(event.occurredAt).getTime()
    );
  }

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

        // The same envelope arriving twice is durable already.
        if (await isSameEnvelope(candidate, ctx)) return "duplicate";

        // A different envelope holds the slot: take the next free sequence.
        const highest = await highestSequence(candidate, ctx);
        candidate = { ...candidate, sequence: Math.max(highest, candidate.sequence) + 1 };
      }

      // Sustained contention: the envelope is not durable, and saying so is
      // better than reporting a duplicate that never happened.
      throw toRepositoryError(
        { code: "23505", message: "sequence contention", details: "", hint: "", name: "" },
        ctx,
      );
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
