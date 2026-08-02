/**
 * PresenceService — Foundation §3, Sprint 1.6.
 *
 * Presence is a derived, transport-carried fact: the catalog publishes no
 * presence event, so this service stays a pure decision surface over
 * `presence_status` (Database Spec §5) and the §14.3 inactivity window. The
 * Realtime adapter that feeds it arrives in a later sprint.
 */
import type { PresenceStatus, VisibilityScope } from "@/domain/shared/domain-enums";
import { ROOM } from "@/shared/constants/system-constants";

import type { DomainServiceContext } from "./service-context";

export interface PresenceObservation {
  readonly profileId: string;
  readonly status: PresenceStatus;
  /** ISO-8601 UTC of the last signal received for this member. */
  readonly lastSeenAt: string;
}

export interface PresenceService {
  isPresent(status: PresenceStatus): boolean;
  /** Foundation §14.3 — 30 minutes without a signal is an inactive room. */
  isInactive(observations: readonly PresenceObservation[], now?: Date): boolean;
  /** Privacy preference decides who may read presence at all (ADR-005). */
  canReveal(scope: VisibilityScope, viewerIsRecentPartner: boolean): boolean;
  /** Collapses per-member observations into the room-level status. */
  summarize(observations: readonly PresenceObservation[]): {
    present: readonly string[];
    absent: readonly string[];
  };
}

export function createPresenceService(context: DomainServiceContext): PresenceService {
  const { clock } = context;

  const isPresent = (status: PresenceStatus): boolean =>
    status === "online" || status === "idle" || status === "buffering";

  return {
    isPresent,

    isInactive(observations, now = clock.now()) {
      if (observations.length === 0) return true;
      const newest = Math.max(...observations.map((o) => Date.parse(o.lastSeenAt)));
      return now.getTime() - newest >= ROOM.INACTIVITY_TIMEOUT_MS;
    },

    canReveal(scope, viewerIsRecentPartner) {
      if (scope === "everyone") return true;
      if (scope === "recent_partners") return viewerIsRecentPartner;
      return false;
    },

    summarize(observations) {
      const present: string[] = [];
      const absent: string[] = [];
      for (const observation of observations) {
        (isPresent(observation.status) ? present : absent).push(observation.profileId);
      }
      return { present, absent };
    },
  };
}
