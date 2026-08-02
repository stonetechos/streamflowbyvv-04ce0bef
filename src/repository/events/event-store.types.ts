/**
 * Event persistence contracts — Sprint 1.9, Foundation §4 / Domain Event
 * Catalog v1.0 §1.
 *
 * The neutral shape of a stored domain event and the store that appends it.
 * No table, column, driver, or serialization format appears here: an
 * Infrastructure adapter decides how the envelope is physically written
 * (Build Rules §25).
 */
import { createRepositoryToken, type RepositoryToken } from "@/repository/repository-registry";

/** JSON-safe payload as it crosses the repository boundary. */
export type EventPayloadRecord = Readonly<Record<string, unknown>>;

/**
 * Neutral projection of the domain event envelope. Field-for-field the
 * catalog envelope; nothing is added, nothing is renamed.
 */
export interface StoredDomainEvent {
  readonly eventName: string;
  readonly eventVersion: number;
  readonly aggregateType: string;
  readonly aggregateId: string;
  /** Monotonic per aggregate, gapless. Preserves ordering across replays. */
  readonly sequence: number;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly actorProfileId: string | null;
  readonly payload: EventPayloadRecord;
}

/** Outcome of an append. `duplicate` is a success: the event was already stored. */
export type EventAppendResult = "stored" | "duplicate";

/**
 * Append-only event store. Implementations MUST be replay-safe: appending the
 * same (aggregate, event, sequence) twice stores one row and reports
 * `duplicate` rather than failing.
 */
export interface EventStoreRepository {
  append(event: StoredDomainEvent): Promise<EventAppendResult>;
  /** Highest stored sequence for an aggregate, or 0. Used to reseed the bus. */
  latestSequence(aggregateType: string, aggregateId: string): Promise<number>;
}

export const EVENT_STORE_REPOSITORY: RepositoryToken<EventStoreRepository> =
  createRepositoryToken<EventStoreRepository>("EventStoreRepository");
