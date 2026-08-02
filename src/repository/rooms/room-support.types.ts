/**
 * Room-cluster support contracts — Sprint 1.8, Foundation §5.
 *
 * Two collaborators the room business flow needs that are not aggregate
 * repositories: human-readable code allocation (Database Spec §3.11
 * `allocate_code`) and an atomicity boundary for the multi-table room creation
 * (Foundation §5.4).
 *
 * Both are expressed in Domain terms. No table, function name, driver, or
 * transaction primitive appears here — an Infrastructure adapter decides how
 * the guarantee is achieved (Build Rules §25).
 */
import { createRepositoryToken, type RepositoryToken } from "@/repository/repository-registry";
import type { EntityCode, UnitOfWork } from "@/repository/repository.types";

/** Entity code prefixes issued by the store (Database Spec §3.11). */
export const CODE_PREFIXES = Object.freeze({
  ROOM: "ROM",
  INVITE: "INV",
});

export type CodePrefix = (typeof CODE_PREFIXES)[keyof typeof CODE_PREFIXES];

/**
 * Allocates the next human-readable display code for a prefix, e.g. `ROM-000001`.
 * Allocation is serialized by the store; the Domain never derives a code itself.
 */
export interface CodeAllocator {
  allocate(prefix: CodePrefix): Promise<EntityCode>;
}

/**
 * Atomicity boundary for writes that must land together (room + state + host
 * membership). Implementations may use a real transaction, a stored procedure,
 * or compensation; callers only observe all-or-nothing.
 */
export type RoomUnitOfWork = UnitOfWork;

export const CODE_ALLOCATOR: RepositoryToken<CodeAllocator> =
  createRepositoryToken<CodeAllocator>("CodeAllocator");

export const ROOM_UNIT_OF_WORK: RepositoryToken<RoomUnitOfWork> =
  createRepositoryToken<RoomUnitOfWork>("RoomUnitOfWork");
