/**
 * Domain service context — Sprint 1.6 §3.
 *
 * The only collaborators an orchestration service receives. No repository, no
 * HTTP client, no vendor SDK: services in this sprint decide and announce,
 * they do not persist (Foundation §2, §3).
 */
import type { EventPublisher } from "@/domain/events/event-bus";
import type { Clock, EventMetadata } from "@/domain/events/event.types";

export interface DomainServiceContext {
  readonly events: EventPublisher;
  readonly clock: Clock;
}

/** Every service call carries the intent that caused it (catalog §1). */
export type Intent = EventMetadata;
