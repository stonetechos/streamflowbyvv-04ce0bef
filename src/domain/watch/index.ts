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
  classifyFreshness,
  deriveRoomConsole,
  formatRoomClock,
  latestDeclaration,
  projectDeclaredClock,
  type HostDeclaration,
  type HostDeclarationKind,
  type PresenceFreshness,
  type RoomClockKind,
  type RoomConsoleAction,
  type RoomConsoleClock,
  type RoomConsoleInput,
  type RoomConsolePhase,
  type RoomConsoleView,
} from "./room-console";

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
  BLOCKED_PROVIDER_KEYS,
  deriveRoomScope,
  isBlockedProviderKey,
  resolveWatchProviderId,
  type RoomScope,
  type RoomScopeInput,
} from "./room-scope";
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
export {
  BETA_ACQUISITION_EVENTS,
  BETA_ACTIVATION_EVENTS,
  BETA_JOIN_CODE_EVENTS,
  BETA_PERSONALIZATION_EVENTS,
  BETA_COMPLETION_EVENTS,
  BETA_EVENTS,
  BETA_RELIABILITY_EVENTS,
  BETA_SOCIAL_EVENTS,
  EMPTY_FUNNEL,
  BETA_PROGRAMME_EVENTS,
  activationRate,
  computeFunnel,
  computeReliability,
  createBetaAnalytics,
  dedupeKey,
  isBetaEvent,
  rate,
  sanitizeContext,
  type AnalyticsContext,
  type AnalyticsEventName,
  type BetaAnalyticsRecorder,
  type BetaAnalyticsSnapshot,
  type BetaEvent,
  type BetaEventName,
  type DeviceCategory,
  type FunnelCounts,
  type FunnelMetrics,
  type ReliabilityMetrics,
  type RoomRoleLabel,
} from "./beta-analytics";
export {
  ACTIVATION_EVENT,
  ACTIVATION_REQUIREMENTS,
  EMPTY_TIMELINE,
  createActivationTracker,
  isRoomActivated,
  medianOf,
  missingActivationRequirements,
  sessionDuration,
  timeFromSelectionToWatching,
  timeToFirstGuest,
  type ActivationEventName,
  type ActivationFacts,
  type ActivationRequirement,
  type ActivationRoomState,
  type ActivationSummary,
  type ActivationTracker,
  type RoomTimeline,
} from "./beta-activation";
export {
  ACTIVATION_STATUSES,
  BETA_ACCESS_MODES,
  BETA_DENIAL_REASONS,
  CLOSED_BETA,
  COHORT_DIMENSIONS,
  FEEDBACK_STATUSES,
  INVITE_SOURCES,
  assignCohort,
  evaluateBetaAccess,
  isInviteSource,
  matchesCohort,
  resetCohort,
  sanitizeCohort,
  withActivationStatus,
  withFeedbackStatus,
  type ActivationStatus,
  type BetaAccessConfig,
  type BetaAccessDecision,
  type BetaAccessMode,
  type BetaDenialReason,
  type CohortAssignment,
  type CohortDimension,
  type CohortFacts,
  type CohortFilter,
  type FeedbackStatus,
  type InviteSource,
} from "./beta-cohort";
export {
  INTERVIEW_QUESTIONS,
  INTERVIEW_SIGNALS,
  REPEATED_RECONNECT_FAILURES,
  buildInterviewQueue,
  candidateSignals,
  type InterviewCandidate,
  type InterviewEntry,
  type InterviewQuestion,
  type InterviewSignal,
} from "./interview-queue";
export {
  BILLING_ENABLED,
  CONCEPT_EXTENDS,
  CORE_MVP_CAPABILITIES,
  PAY_ANSWERS,
  PREMIUM_CONCEPTS,
  VALUE_ANSWERS,
  buildResearchResponse,
  isBillingActive,
  isCoreCapability,
  isPremiumConcept,
  summarizeResearch,
  validateConcepts,
  type ConceptSummary,
  type CoreCapability,
  type PayAnswer,
  type PremiumConcept,
  type ResearchResponse,
  type ValueAnswer,
} from "./monetization-research";
export {
  buildSessionSummary,
  shouldShowReconnects,
  summaryMinutes,
  type SessionSummary,
} from "./session-summary";
export {
  FEEDBACK_CATEGORIES,
  FEEDBACK_COMMENT_MAX,
  FEEDBACK_OUTCOMES,
  buildFeedback,
  isFeedbackCategory,
  shouldPromptFeedback,
  summarizeFeedback,
  type FeedbackCategory,
  type FeedbackEntry,
  type FeedbackOutcome,
} from "./beta-feedback";
export {
  deriveActivationPlan,
  type ActivationAction,
  type ActivationInput,
  type ActivationPlan,
  type ActivationStep,
  type ActivationStepState,
} from "./room-activation";
export {
  FAILURE_KINDS,
  describeFailure,
  isFailureKind,
  type FailureGuidance,
  type FailureKind,
} from "./room-reliability";
// Sprint H9 — homepage app arrangement. Discovery preference only; it never
// touches a provider's capability or sync mode.
export {
  DEFAULT_HOMEPAGE_LAYOUT,
  arrangeApps,
  hideApp,
  isCustomized,
  moveApp,
  normalizeLayout,
  pinApp,
  resetLayout,
  shiftApp,
  unhideApp,
  unpinApp,
  visibleOrder,
  type ArrangedApps,
  type HomepageLayout,
} from "./homepage-layout";
export {
  EMPTY_JOIN_SPEED,
  EMPTY_PERSONALIZATION,
  summarizeJoinSpeed,
  summarizePersonalization,
  type JoinAttemptFact,
  type JoinPath,
  type JoinSpeedMetrics,
  type PersonalizationFact,
  type PersonalizationMetrics,
  type SelectionFact,
} from "./join-metrics";
