/**
 * Room presence domain models — Sprint 2.1.
 *
 * Presence is the ephemeral liveness signal that sits beside durable
 * membership (Database Spec §3.2 `room_presence`). It is deliberately a
 * separate model: a member can be in a room while their device is not.
 *
 * Conventions match `room.types.ts` — ISO-8601 UTC strings, `null` for absent
 * values, no vendor type, no behaviour. Decisions over these values belong to
 * `PresenceService` (Sprint 1.6).
 *
 * Nothing here carries credential material of any kind. `connection_id` is a
 * per-tab identifier minted client-side; it is not a session, not a token, and
 * never a provider artifact (Session Continuity rule).
 */
import type { PresenceStatus } from "@/domain/shared/domain-enums";

import type { IsoTimestamp } from "./room.types";

/** A single live connection of one profile to one room. */
export interface RoomPresence {
  readonly id: string;
  readonly roomId: string;
  readonly profileId: string;
  readonly status: PresenceStatus;
  /** Per-connection identifier; a second tab is a second connection. */
  readonly connectionId: string;
  readonly deviceKind: string | null;
  readonly lastHeartbeatAt: IsoTimestamp;
  readonly latencyMs: number | null;
  /** Client↔server clock skew; measured by the sync engine in a later sprint. */
  readonly clockOffsetMs: number | null;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * One heartbeat. The store upserts on (room, profile, connection), so the
 * caller never has to know whether a row already exists.
 */
export interface PresenceHeartbeat {
  readonly roomId: string;
  readonly profileId: string;
  readonly connectionId: string;
  readonly status: PresenceStatus;
  readonly deviceKind?: string | null;
  readonly latencyMs?: number | null;
  readonly clockOffsetMs?: number | null;
}
