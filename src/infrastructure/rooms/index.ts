/**
 * Room persistence adapter selection — Sprint 1.7, mirroring the Sprint 1.3
 * persistence seam and the Sprint 1.5 identity seam.
 *
 * The composition root imports THIS module. Moving the room cluster to
 * user-owned PostgreSQL, Neon, SQLite, or a remote API is a change to this
 * file plus one sibling adapter folder — nothing above Infrastructure moves.
 *
 * No vendor type, client, or row shape is re-exported here.
 */
import { registerSupabaseRoomAdapter } from "../supabase/rooms";

/** Describes the compiled-in room adapter. Diagnostics only — never branch on it. */
export interface RoomAdapterDescriptor {
  readonly id: string;
  /** Compare-and-set on the room-state version is supported (ADR-004). */
  readonly supportsOptimisticConcurrency: true;
}

export const ACTIVE_ROOM_ADAPTER: RoomAdapterDescriptor = Object.freeze({
  id: "postgres-supabase",
  supportsOptimisticConcurrency: true,
});

/**
 * Binds the room, room-state, room-member, and invite contracts to the active
 * adapter. Idempotent, and a no-op when the backend is not configured.
 */
export function registerRoomAdapter(): boolean {
  return registerSupabaseRoomAdapter();
}
