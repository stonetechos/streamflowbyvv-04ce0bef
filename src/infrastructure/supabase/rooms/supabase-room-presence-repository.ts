/**
 * Room presence mappers and adapter — Sprint 2.1.
 *
 * The only module that knows presence is stored in `public.room_presence`.
 * Rows enter, `RoomPresence` leaves. Writes go through an upsert on the
 * (room, profile, connection) uniqueness constraint so a repeated heartbeat
 * never grows the table.
 */
import type { PresenceHeartbeat, RoomPresence } from "@/domain/rooms/presence.types";
import { PRESENCE_STATUSES } from "@/domain/shared/domain-enums";
import { REPOSITORY_ERRORS, RepositoryError } from "@/repository";
import type { RoomPresenceRepository } from "@/repository/rooms/presence-repository.types";
import type { EntityId } from "@/repository/repository.types";

import type { DataConnection } from "../connection";
import { runCommand, runQuery } from "../query-wrapper";
import { requireAvailable } from "./room-query-support";
import type { TableRow } from "../supabase.types";

export type RoomPresenceRow = TableRow<"room_presence">;

const AGGREGATE = "room_presence";

/** Explicit projection — no `select("*")` across the boundary (Foundation §10). */
export const ROOM_PRESENCE_COLUMNS =
  "id, room_id, profile_id, status, connection_id, device_kind, last_heartbeat_at, latency_ms, clock_offset_ms, created_at, updated_at";

export function toRoomPresence(row: RoomPresenceRow): RoomPresence {
  if (!(PRESENCE_STATUSES as readonly string[]).includes(row.status)) {
    throw new RepositoryError(REPOSITORY_ERRORS.CONSTRAINT_VIOLATION, {
      aggregate: AGGREGATE,
      operation: "map:status",
    });
  }
  return {
    id: row.id,
    roomId: row.room_id,
    profileId: row.profile_id,
    status: row.status as RoomPresence["status"],
    connectionId: row.connection_id,
    deviceKind: row.device_kind,
    lastHeartbeatAt: row.last_heartbeat_at,
    latencyMs: row.latency_ms,
    clockOffsetMs: row.clock_offset_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSupabaseRoomPresenceRepository(
  connection: DataConnection,
): RoomPresenceRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  const table = () => connection.client().from("room_presence");

  return {
    async heartbeat(beat: PresenceHeartbeat): Promise<RoomPresence> {
      requireAvailable(connection, context("heartbeat", beat.roomId));
      const now = new Date().toISOString();
      const row = await runQuery<RoomPresenceRow>(
        table()
          .upsert(
            {
              room_id: beat.roomId,
              profile_id: beat.profileId,
              connection_id: beat.connectionId,
              status: beat.status,
              device_kind: beat.deviceKind ?? null,
              latency_ms: beat.latencyMs ?? null,
              clock_offset_ms: beat.clockOffsetMs ?? null,
              last_heartbeat_at: now,
              updated_at: now,
            },
            { onConflict: "room_id,profile_id,connection_id" },
          )
          .select(ROOM_PRESENCE_COLUMNS)
          .single(),
        context("heartbeat", beat.roomId),
      );
      return toRoomPresence(row);
    },

    async listByRoom(roomId: EntityId): Promise<readonly RoomPresence[]> {
      requireAvailable(connection, context("listByRoom", roomId));
      const rows = await runQuery<RoomPresenceRow[]>(
        table()
          .select(ROOM_PRESENCE_COLUMNS)
          .eq("room_id", roomId)
          .order("last_heartbeat_at", { ascending: false }),
        context("listByRoom", roomId),
      );
      return (rows ?? []).map(toRoomPresence);
    },

    async release(
      roomId: EntityId,
      profileId: EntityId,
      connectionId: string,
    ): Promise<void> {
      requireAvailable(connection, context("release", roomId));
      await runCommand(
        table()
          .delete()
          .eq("room_id", roomId)
          .eq("profile_id", profileId)
          .eq("connection_id", connectionId),
        context("release", roomId),
      );
    },
  };
}
