/**
 * Presence coordinator — Sprint 2.1.
 *
 * A thin Domain-side seam between the Waiting Room and the presence store.
 * It owns no rule: liveness classification is delegated to `PresenceService`
 * (Sprint 1.6), and the numbers it uses come from `system-constants`
 * (Build Rules §10). Its whole job is to make "who is online right now" a
 * Domain question rather than a storage one, so the Feature layer never sees
 * a repository (Foundation §2).
 *
 * Privacy: this coordinator reports only members of the room the viewer is
 * already looking at, and only liveness — never a device fingerprint, never a
 * location, never anything provider-owned.
 */
import { createServiceToken } from "@/domain/service-registry";
import type { PresenceObservation, PresenceService } from "@/domain/services/presence-service";
import type { PresenceStatus } from "@/domain/shared/domain-enums";
import {
  ROOM_PRESENCE_REPOSITORY,
  isRepositoryBound,
  resolveRepository,
  type EntityId,
  type RoomPresenceRepository,
} from "@/repository";
import { PRESENCE } from "@/shared/constants/system-constants";

import type { PresenceHeartbeat, RoomPresence } from "./presence.types";

/** Liveness of one profile in one room, collapsed across its connections. */
export interface MemberPresence {
  readonly profileId: string;
  readonly status: PresenceStatus;
  readonly lastSeenAt: string;
  /** False once the newest heartbeat is older than the stale window. */
  readonly isOnline: boolean;
  /**
   * Sprint 2.6 — synchronization metrics carried on the existing presence
   * columns (`clock_offset_ms`, `latency_ms`). Reported as measured; the band
   * they fall in is decided by `RoomSyncCoordinator`, never here.
   */
  readonly clockOffsetMs: number | null;
  readonly latencyMs: number | null;
}

export interface RoomPresenceSnapshot {
  readonly members: readonly MemberPresence[];
  /** True when no member has signalled inside the inactivity window. */
  readonly isRoomInactive: boolean;
  readonly observedAt: string;
}

export interface PresenceCoordinator {
  /** False when no presence store is bound; callers degrade, never crash. */
  isAvailable(): boolean;
  heartbeat(beat: PresenceHeartbeat): Promise<void>;
  observe(roomId: EntityId): Promise<RoomPresenceSnapshot>;
  release(roomId: EntityId, profileId: EntityId, connectionId: string): Promise<void>;
}

export interface PresenceCoordinatorDependencies {
  /** Absent when the deployment has no presence store bound. */
  readonly presence: RoomPresenceRepository | null;
  readonly service: PresenceService;
  readonly now: () => Date;
}

const EMPTY_SNAPSHOT = (observedAt: string): RoomPresenceSnapshot =>
  Object.freeze({ members: [], isRoomInactive: true, observedAt });

/** Newest heartbeat per profile wins; a second tab must not read as two people. */
function collapseByProfile(rows: readonly RoomPresence[]): readonly RoomPresence[] {
  const newest = new Map<string, RoomPresence>();
  for (const row of rows) {
    const current = newest.get(row.profileId);
    if (!current || Date.parse(row.lastHeartbeatAt) > Date.parse(current.lastHeartbeatAt)) {
      newest.set(row.profileId, row);
    }
  }
  return [...newest.values()];
}

export function createPresenceCoordinator(
  deps: PresenceCoordinatorDependencies,
): PresenceCoordinator {
  const { presence, service, now } = deps;

  return {
    isAvailable: () => presence !== null,

    async heartbeat(beat) {
      if (!presence) return;
      await presence.heartbeat(beat);
    },

    async observe(roomId) {
      const observedAt = now().toISOString();
      if (!presence) return EMPTY_SNAPSHOT(observedAt);

      const rows = collapseByProfile(await presence.listByRoom(roomId));
      const threshold = now().getTime() - PRESENCE.STALE_AFTER_MS;

      const members = rows.map((row) => {
        const fresh = Date.parse(row.lastHeartbeatAt) >= threshold;
        return Object.freeze({
          profileId: row.profileId,
          // A stale row is reported as disconnected regardless of what it last
          // claimed: the absence of a heartbeat is the signal.
          status: fresh ? row.status : ("disconnected" as PresenceStatus),
          lastSeenAt: row.lastHeartbeatAt,
          isOnline: fresh && service.isPresent(row.status),
          // Stale rows keep their last measurement but are excluded from room
          // health by the coordinator, which only aggregates online devices.
          clockOffsetMs: row.clockOffsetMs,
          latencyMs: row.latencyMs,
        });
      });

      const observations: readonly PresenceObservation[] = members.map((member) => ({
        profileId: member.profileId,
        status: member.status,
        lastSeenAt: member.lastSeenAt,
      }));

      return Object.freeze({
        members,
        isRoomInactive: service.isInactive(observations, now()),
        observedAt,
      });
    },

    async release(roomId, profileId, connectionId) {
      if (!presence) return;
      await presence.release(roomId, profileId, connectionId);
    },
  };
}

export function resolvePresenceCoordinatorDependencies(
  service: PresenceService,
  now: () => Date,
): PresenceCoordinatorDependencies {
  return {
    presence: isRepositoryBound(ROOM_PRESENCE_REPOSITORY)
      ? resolveRepository(ROOM_PRESENCE_REPOSITORY)
      : null,
    service,
    now,
  };
}

export const PRESENCE_COORDINATOR = createServiceToken<PresenceCoordinator>("PresenceCoordinator");
