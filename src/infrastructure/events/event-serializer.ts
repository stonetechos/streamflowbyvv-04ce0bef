/**
 * Domain envelope → neutral stored record — Sprint 1.9.
 *
 * The single translation point between the in-process event envelope and the
 * repository-layer shape. Correlation and causation ids are carried through
 * verbatim: an intent must remain traceable from utterance to projection
 * (Foundation §4, Catalog §1).
 */
import type { CatalogEvent } from "@/domain/events";
import type { EventPayloadRecord, StoredDomainEvent } from "@/repository";

/** Strips undefined so the record is JSON-safe without changing meaning. */
function toJsonSafe(payload: Readonly<Record<string, unknown>>): EventPayloadRecord {
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
  return Object.freeze(Object.fromEntries(entries));
}

export function toStoredEvent(event: CatalogEvent): StoredDomainEvent {
  return Object.freeze({
    eventName: event.eventName,
    eventVersion: event.eventVersion,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    sequence: event.sequence,
    occurredAt: event.occurredAt,
    correlationId: event.correlationId,
    causationId: event.causationId ?? null,
    actorProfileId: event.actorProfileId,
    payload: toJsonSafe(event.payload as Record<string, unknown>),
  });
}

/** Reads a string field from an event payload without widening the envelope. */
export function payloadString(
  event: { payload: Readonly<Record<string, unknown>> },
  field: string,
): string | null {
  const value = event.payload[field];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Reads a string array field from an event payload. */
export function payloadStrings(
  event: { payload: Readonly<Record<string, unknown>> },
  field: string,
): readonly string[] {
  const value = event.payload[field];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
