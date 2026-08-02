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
