/**
 * Realtime transport contract — Sprint 1.9.
 *
 * The outbound half of realtime only. Domain events already persisted are
 * fanned out to interested peers; nothing in v1.9 subscribes, and no UI is
 * allowed to (sprint scope). Channel naming and transport are adapter
 * concerns — this contract names neither.
 */
import { createRepositoryToken, type RepositoryToken } from "@/repository/repository-registry";

import type { StoredDomainEvent } from "./event-store.types";

export interface RealtimeEventPublisher {
  /**
   * Publishes an already-persisted domain event. Best-effort: a transport
   * failure must never fail the originating business operation.
   */
  publish(event: StoredDomainEvent): Promise<void>;
  /** Releases any transport resources held for an aggregate. */
  release(aggregateType: string, aggregateId: string): Promise<void>;
}

export const REALTIME_EVENT_PUBLISHER: RepositoryToken<RealtimeEventPublisher> =
  createRepositoryToken<RealtimeEventPublisher>("RealtimeEventPublisher");

/**
 * Inbound half of realtime — Sprint 2.0.
 *
 * Sprint 1.9 built the outbound publisher; a lobby has to hear what it
 * publishes. The contract stays neutral: no channel name, no socket, no
 * driver type. Delivery is best-effort and unordered — the store, not the
 * transport, remains the source of truth (Foundation §4), so a listener
 * treats a notice as "re-read", never as state.
 */
export type RealtimeEventListener = (event: StoredDomainEvent) => void;

export interface RealtimeEventSubscriber {
  /** Resolves to a detach function; calling it twice is safe. */
  subscribe(
    aggregateType: string,
    aggregateId: string,
    listener: RealtimeEventListener,
  ): Promise<() => void>;
}

export const REALTIME_EVENT_SUBSCRIBER: RepositoryToken<RealtimeEventSubscriber> =
  createRepositoryToken<RealtimeEventSubscriber>("RealtimeEventSubscriber");
