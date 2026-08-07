/**
 * Watch-party domain surface — Sprint H1.
 *
 * Binds the two Sprint H1 services. Idempotent, and safe to call before a
 * backend exists: each service reports itself unavailable instead of throwing.
 */
import { bindService, isServiceBound } from "@/domain/service-registry";

import {
  createWatchChatService,
  resolveWatchChatDependencies,
  WATCH_CHAT_SERVICE,
} from "./watch-chat-service";
import {
  createRoomGovernanceService,
  resolveRoomGovernanceDependencies,
  ROOM_GOVERNANCE_SERVICE,
} from "./room-governance-service";
import {
  createWatchSourceService,
  resolveWatchSourceDependencies,
  WATCH_SOURCE_SERVICE,
} from "./watch-source-service";
import {
  createWatchSyncService,
  resolveWatchSyncDependencies,
  WATCH_SYNC_SERVICE,
} from "./watch-sync-service";

export function registerWatchServices(): void {
  if (!isServiceBound(WATCH_CHAT_SERVICE)) {
    bindService(WATCH_CHAT_SERVICE, () => createWatchChatService(resolveWatchChatDependencies()));
  }
  if (!isServiceBound(WATCH_SYNC_SERVICE)) {
    bindService(WATCH_SYNC_SERVICE, () => createWatchSyncService(resolveWatchSyncDependencies()));
  }
  if (!isServiceBound(ROOM_GOVERNANCE_SERVICE)) {
    bindService(ROOM_GOVERNANCE_SERVICE, () =>
      createRoomGovernanceService(resolveRoomGovernanceDependencies()),
    );
  }
  if (!isServiceBound(WATCH_SOURCE_SERVICE)) {
    bindService(WATCH_SOURCE_SERVICE, () =>
      createWatchSourceService(resolveWatchSourceDependencies()),
    );
  }
}

export {
  COORDINATION_METADATA_KEY,
  DEFAULT_DRIFT_POLICY,
  DEFAULT_READINESS_THRESHOLD,
  authorizeCommand,
  classifyDriftCorrection,
  createRoomEvent,
  decodeCoordination,
  emptyPlaybackState,
  encodeCoordination,
  isFreshRevision,
  isStaleEvent,
  isStateChanging,
  projectPositionSeconds,
  reduceState,
  resolveDriftPolicy,
  summarizeReadiness,
  syncStatusFor,
  toPlaybackState,
  type CommandContext,
  type CommandRejection,
  type CommandVerdict,
  type CoordinationClaim,
  type CoordinationKind,
  type CoordinationRequest,
  type DriftConditions,
  type DriftCorrection,
  type DriftPolicy,
  type ParticipantRuntime,
  type ParticipantRuntimeState,
  type PlaybackState,
  type PlaybackStatusValue,
  type ReadinessSummary,
  type ReadinessThreshold,
  type RoomCommand,
  type RoomCommandKind,
  type RoomEvent,
  type RoomEventInput,
  type RoomEventType,
  type SyncStatusLabel,
} from "./room-runtime";
export {
  CHAT_MESSAGE_MAX_LENGTH,
  WATCH_CHAT_SERVICE,
  createWatchChatService,
  type ChatRejection,
  type RoomMessage,
  type WatchChatService,
} from "./watch-chat-service";
export {
  DRIFT_HARD_MS,
  DRIFT_SYNCED_MS,
  WATCH_SYNC_SERVICE,
  createWatchSyncService,
  type WatchIntent,
  type WatchPhase,
  type WatchState,
  type CommandOutcome,
  type WatchSyncService,
  type WatchVerdict,
} from "./watch-sync-service";
export {
  EMPTY_WATCH_SELECTION,
  NETFLIX_BROWSE_URL,
  WATCH_MEDIA_METADATA_KEY,
  WATCH_PROVIDERS,
  WATCH_PROVIDER_DEFINITIONS,
  WATCH_SOURCE_METADATA_KEY,
  WATCH_TITLE_METADATA_KEY,
  deriveRoomPhase,
  mediaRefSelection,
  mediaRefToSource,
  netflixTitleUrl,
  parseNetflixTitleId,
  parseWatchSource,
  providerBrowseUrl,
  readRoomMediaRef,
  readWatchSelection,
  readWatchSource,
  toRoomMediaRef,
  unknownProviderCapability,
  watchProviderById,
  watchSelectionLabel,
  watchSourceCapability,
  type MediaRefValidity,
  type PlaybackControlMode,
  type RoomPhase,
  type ProviderSelectionMode,
  type RoomMediaRef,
  type WatchProviderCapability,
  type WatchSelection,
  type WatchSource,
  type WatchSourceCapability,
} from "./watch-source";
export {
  WATCH_SOURCE_SERVICE,
  createWatchSourceService,
  type WatchSourceService,
} from "./watch-source-service";
export {
  DEFAULT_GOVERNANCE,
  GOVERNANCE_METADATA_KEY,
  canPerform,
  classifyPresence,
  nextRecoveryPhase,
  readGovernance,
  resolveInvite,
  seatRole,
  shouldAdoptSnapshot,
  writeGovernance,
  type InviteFacts,
  type InviteResolution,
  type ModerationAction,
  type PermissionContext,
  type PresenceFacts,
  type RecoveryPhase,
  type RoomGovernanceSettings,
  type RoomSeatRole,
  type SocialPresence,
} from "./room-governance";
export {
  ROOM_GOVERNANCE_SERVICE,
  createRoomGovernanceService,
  type RoomGovernanceService,
} from "./room-governance-service";
export {
  PRODUCT_EVENTS,
  createDevMetricsRecorder,
  productEvent,
  sanitizeProps,
  type DevMetricsRecorder,
  type DevMetricsSnapshot,
  type ProductEvent,
  type ProductEventName,
  type ProductEventProps,
} from "./room-analytics";
