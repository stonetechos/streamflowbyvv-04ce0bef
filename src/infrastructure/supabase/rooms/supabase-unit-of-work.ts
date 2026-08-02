/**
 * Room unit of work — Sprint 1.8, reviewed Sprint 1.9.
 *
 * PostgREST exposes no client-side transaction, so atomicity for the
 * multi-table room creation is achieved by ordered writes plus caller-side
 * compensation (the Domain rolls back what it created when a later step
 * fails). The contract the Domain sees is unchanged: if a future adapter gains
 * a real transaction or a stored procedure, only this file moves.
 *
 * Sprint 1.9 deferral: replacing compensation with a genuine transaction
 * requires a server-side routine (a SQL function that creates room, state, and
 * host membership in one statement). That is a schema change outside this
 * sprint's scope, so it is deferred; compensation remains correct in the
 * meantime because every step is individually reversible.
 */
import type { RoomUnitOfWork } from "@/repository/rooms/room-support.types";

export function createSupabaseRoomUnitOfWork(): RoomUnitOfWork {
  return {
    run: <T>(work: () => Promise<T>): Promise<T> => work(),
  };
}
