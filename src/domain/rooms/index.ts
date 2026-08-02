/**
 * Room aggregate domain models — Sprint 1.7.
 * Types only; room behaviour lives in `@/domain/services` (Sprint 1.6).
 */
export type {
  Invite,
  InviteDraft,
  InvitePatch,
  IsoTimestamp,
  MetadataBag,
  Room,
  RoomDraft,
  RoomMember,
  RoomMemberDraft,
  RoomMemberPatch,
  RoomPatch,
  RoomState,
  RoomStateDraft,
  RoomStatePatch,
} from "./room.types";
export {
  createRoomFlowService,
  resolveRoomFlowDependencies,
  type ComplianceContext,
  type InviteCreationRequest,
  type RoomCreationRequest,
  type RoomCreationResult,
  type RoomFlowDependencies,
  type RoomFlowService,
} from "./room-flow-service";
