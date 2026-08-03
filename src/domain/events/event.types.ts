/**
 * Domain event envelope — Sprint 1.6 §2.
 *
 * Traceability: Domain Event Catalog v1.0 §1 and Foundation §4. Every event
 * carries the same envelope; only `payload` varies. Field names are the Domain
 * camelCase form of the catalog's snake_case wire names — translation to the
 * persisted shape belongs to the Repository layer, never here.
 *
 * Vendor-neutral by construction: nothing in this module imports Infrastructure.
 */

/** Catalog §1 — `aggregate_type`. */
export const AGGREGATE_TYPES = [
  "profile",
  "room",
  "provider",
  "po_session",
  "feature_flag",
] as const;
export type AggregateType = (typeof AGGREGATE_TYPES)[number];

export type EventName = string;
export type CorrelationId = string;
export type CausationId = string;

/** Immutable envelope. Payloads are deep-frozen before dispatch. */
export interface DomainEvent<TName extends EventName = EventName, TPayload = unknown> {
  readonly eventName: TName;
  /** Integer, starts at 1. A changed payload shape is a new version. */
  readonly eventVersion: number;
  readonly aggregateType: AggregateType;
  readonly aggregateId: string;
  /** Monotonic per aggregate, gapless. */
  readonly sequence: number;
  /** UTC ISO-8601, server clock. */
  readonly occurredAt: string;
  /** Groups everything caused by one user intent, including Po utterances. */
  readonly correlationId: CorrelationId;
  /** The event or command that directly caused this one. */
  readonly causationId?: CausationId | undefined;
  /** Null for system-originated events. */
  readonly actorProfileId: string | null;
  readonly payload: Readonly<TPayload>;
}

/** Everything the caller supplies; the bus derives sequence and occurredAt. */
export interface EventMetadata {
  readonly correlationId: CorrelationId;
  readonly causationId?: CausationId | undefined;
  readonly actorProfileId?: string | null | undefined;
  /** Test/replay support only; defaults to the injected clock. */
  readonly occurredAt?: string | undefined;
}

export type EventHandler<E extends DomainEvent = DomainEvent> = (event: E) => void | Promise<void>;

export type Unsubscribe = () => void;

export interface EventSubscription {
  readonly eventName: EventName | "*";
  readonly handler: EventHandler;
}

/** Injected clock: Domain never reads device time directly (Foundation §15). */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
