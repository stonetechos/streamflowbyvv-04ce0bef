/**
 * Supabase room-cluster adapter — Sprint 1.7 (mirrors the Sprint 1.5 auth
 * adapter registration).
 *
 * Registration is idempotent and CONDITIONAL: with no persistence endpoint
 * configured nothing is bound, and a resolve attempt reports
 * `SF-SYS-PERSISTENCE-UNAVAILABLE` rather than crashing the shell. A fresh
 * clone with no `.env` still boots.
 *
 * The composition root calls the neutral seam in `@/infrastructure/rooms`; it
 * never imports this folder.
 */
import { bindRepository, isRepositoryBound } from "@/repository/repository-registry";
import {
  CODE_ALLOCATOR,
  ROOM_UNIT_OF_WORK,
} from "@/repository/rooms/room-support.types";
import { ROOM_PRESENCE_REPOSITORY } from "@/repository/rooms/presence-repository.types";
import {
  INVITE_REPOSITORY,
  ROOM_MEMBER_REPOSITORY,
  ROOM_REPOSITORY,
  ROOM_STATE_REPOSITORY,
} from "@/repository/rooms/room-repository.types";

import { getBrowserDataConnection, type DataConnection } from "../connection";
import { createSupabaseCodeAllocator } from "./supabase-code-allocator";
import { createSupabaseInviteRepository } from "./supabase-invite-repository";
import { createSupabaseRoomMemberRepository } from "./supabase-room-member-repository";
import { createSupabaseRoomPresenceRepository } from "./supabase-room-presence-repository";
import { createSupabaseRoomRepository } from "./supabase-room-repository";
import { createSupabaseRoomStateRepository } from "./supabase-room-state-repository";
import { createSupabaseRoomUnitOfWork } from "./supabase-unit-of-work";

/** Binds the four room-cluster contracts. Returns false when unconfigured. */
export function registerSupabaseRoomAdapter(connection?: DataConnection): boolean {
  const active = connection ?? getBrowserDataConnection();
  if (!active.isAvailable()) return false;

  if (!isRepositoryBound(ROOM_REPOSITORY)) {
    bindRepository(ROOM_REPOSITORY, () => createSupabaseRoomRepository(active));
  }
  if (!isRepositoryBound(ROOM_STATE_REPOSITORY)) {
    bindRepository(ROOM_STATE_REPOSITORY, () => createSupabaseRoomStateRepository(active));
  }
  if (!isRepositoryBound(ROOM_MEMBER_REPOSITORY)) {
    bindRepository(ROOM_MEMBER_REPOSITORY, () => createSupabaseRoomMemberRepository(active));
  }
  if (!isRepositoryBound(INVITE_REPOSITORY)) {
    bindRepository(INVITE_REPOSITORY, () => createSupabaseInviteRepository(active));
  }
  // Sprint 2.1: ephemeral liveness, separate from durable membership.
  if (!isRepositoryBound(ROOM_PRESENCE_REPOSITORY)) {
    bindRepository(ROOM_PRESENCE_REPOSITORY, () =>
      createSupabaseRoomPresenceRepository(active),
    );
  }
  // Sprint 1.8: code allocation (Database Spec §3.11) and the creation
  // atomicity boundary.
  if (!isRepositoryBound(CODE_ALLOCATOR)) {
    bindRepository(CODE_ALLOCATOR, () => createSupabaseCodeAllocator(active));
  }
  if (!isRepositoryBound(ROOM_UNIT_OF_WORK)) {
    bindRepository(ROOM_UNIT_OF_WORK, () => createSupabaseRoomUnitOfWork());
  }
  return true;
}

export {
  INVITE_COLUMNS,
  ROOM_COLUMNS,
  ROOM_MEMBER_COLUMNS,
  ROOM_STATE_COLUMNS,
  toInvite,
  toRoom,
  toRoomMember,
  toRoomState,
} from "./room-mapper";
export { createSupabaseCodeAllocator } from "./supabase-code-allocator";
export { createSupabaseRoomUnitOfWork } from "./supabase-unit-of-work";
export { createSupabaseInviteRepository } from "./supabase-invite-repository";
export { createSupabaseRoomMemberRepository } from "./supabase-room-member-repository";
export {
  createSupabaseRoomPresenceRepository,
  toRoomPresence,
  ROOM_PRESENCE_COLUMNS,
} from "./supabase-room-presence-repository";
export { createSupabaseRoomRepository } from "./supabase-room-repository";
export { createSupabaseRoomStateRepository } from "./supabase-room-state-repository";
