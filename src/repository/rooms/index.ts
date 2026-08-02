/**
 * Room repository contracts — Sprint 1.7.
 * Re-exported through `@/repository` so Domain never reaches into a subfolder.
 */
export {
  INVITE_REPOSITORY,
  ROOM_MEMBER_REPOSITORY,
  ROOM_REPOSITORY,
  ROOM_STATE_REPOSITORY,
  type InviteQuery,
  type InviteRepository,
  type RoomMemberQuery,
  type RoomMemberRepository,
  type RoomQuery,
  type RoomRepository,
  type RoomStateConcurrencyInfo,
  type RoomStateRepository,
} from "./room-repository.types";
