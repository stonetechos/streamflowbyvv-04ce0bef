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
  INVITE_REPOSITORY,
  ROOM_MEMBER_REPOSITORY,
  ROOM_REPOSITORY,
  ROOM_STATE_REPOSITORY,
} from "@/repository/rooms/room-repository.types";

import { getBrowserDataConnection, type DataConnection } from "../connection";
import { createSupabaseInviteRepository } from "./supabase-invite-repository";
import { createSupabaseRoomMemberRepository } from "./supabase-room-member-repository";
import { createSupabaseRoomRepository } from "./supabase-room-repository";
import { createSupabaseRoomStateRepository } from "./supabase-room-state-repository";

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
export { createSupabaseInviteRepository } from "./supabase-invite-repository";
export { createSupabaseRoomMemberRepository } from "./supabase-room-member-repository";
export { createSupabaseRoomRepository } from "./supabase-room-repository";
export { createSupabaseRoomStateRepository } from "./supabase-room-state-repository";
