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
export type { RoomDiscovery } from "@/repository/rooms/room-discovery.types";
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
  createHomeReadModel,
  resolveHomeReadModelDependencies,
  HOME_READ_MODEL,
  type HomeInviteSummary,
  type HomeReadModel,
  type HomeReadModelDependencies,
  type HomeRoomSummary,
  type HomeSnapshot,
} from "./home-read-model";
export {
  DORMANT_AFTER_MS,
  DORMANT_EMPTY_AFTER_MS,
  classifyRoomActivity,
  isResumableActivity,
  type RoomActivity,
  type RoomActivityInput,
} from "./room-activity";

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
export {
  createPlaybackCoordinator,
  resolvePlaybackCoordinatorDependencies,
  PLAYBACK_COORDINATOR,
  type PlaybackArmRequest,
  type PlaybackCommandResult,
  type PlaybackCoordinator,
  type PlaybackCoordinatorDependencies,
  type PlaybackPositionRequest,
  type PlaybackSeekRequest,
  type PlaybackStopRequest,
} from "./playback-coordinator";
// Sprint 2.9 — the ONLY authority for readiness, countdown availability, and
// the manual-play reminder.
export {
  createReadyCoordinator,
  resolveReadyCoordinatorDependencies,
  READY_COORDINATOR,
  type HostReadySummary,
  type ReadyBlockReason,
  type ReadyCoordinator,
  type ReadyCoordinatorDependencies,
  type ReadyEvaluationInput,
  type ReadyParticipantInput,
  type ReadySnapshot,
  type ViewerReadyState,
} from "./ready-coordinator";
// Sprint H9 — the short, spoken-aloud form of the room's persisted code.
export {
  ROOM_KEY_ALPHABET,
  ROOM_KEY_GROUP,
  ROOM_KEY_JOIN_STATES,
  ROOM_KEY_LENGTH,
  decodeRoomKey,
  encodeRoomKey,
  formatRoomKey,
  isBlockedJoinState,
  isLegacyRoomCode,
  normalizeRoomKeyInput,
  redactRoomKey,
  resolveJoinCode,
  roomKeyStateFromRefusal,
  roomKeyStateMessageKey,
  validateRoomKeyShape,
  type RoomKeyJoinState,
} from "./room-key";
