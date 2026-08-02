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
export {
  createRoomReadModel,
  resolveRoomReadModelDependencies,
  READINESS_METADATA_KEY,
  ROOM_READ_MODEL,
  type RoomReadModel,
  type RoomReadModelDependencies,
  type RoomRealtimeNotice,
  type RoomRealtimeUnsubscribe,
  type WaitingRoomSnapshot,
} from "./room-read-model";
export {
  createRoomSetupService,
  resolveRoomSetupDependencies,
  COUNTDOWN_SECONDS_METADATA_KEY,
  ROOM_SETUP_SERVICE,
  type RoomSetupDependencies,
  type RoomSetupService,
  type SelectProviderRequest,
  type SelectProviderResult,
} from "./room-setup-service";
export type { PresenceHeartbeat, RoomPresence } from "./presence.types";
export {
  createPresenceCoordinator,
  resolvePresenceCoordinatorDependencies,
  PRESENCE_COORDINATOR,
  type MemberPresence,
  type PresenceCoordinator,
  type PresenceCoordinatorDependencies,
  type RoomPresenceSnapshot,
} from "./presence-coordinator";
export {
  createCountdownCoordinator,
  resolveCountdownCoordinatorDependencies,
  COUNTDOWN_COORDINATOR,
  COUNTDOWN_REASONS,
  type CountdownActorRequest,
  type CountdownCoordinator,
  type CountdownCoordinatorDependencies,
  type CountdownStartRequest,
  type CountdownTickSignal,
  type CountdownTickUnsubscribe,
} from "./countdown-coordinator";
