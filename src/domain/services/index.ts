/**
 * Domain services public surface — Sprint 1.6.
 */
export {
  createAnalyticsService,
  type AnalyticsRecord,
  type AnalyticsService,
  type AnalyticsSink,
} from "./analytics-service";
export {
  createComplianceService,
  type ComplianceRequest,
  type ComplianceRule,
  type ComplianceService,
  type ComplianceVerdict,
} from "./compliance-service";
export {
  createFeatureFlagDomainService,
  type FeatureFlagDomainService,
  type FlagEvaluationInput,
} from "./feature-flag-service";
export {
  createInvitationService,
  type CreateInviteInput,
  type InvitationService,
} from "./invitation-service";
export {
  createLocalizationDomainService,
  type LocalizationDomainService,
} from "./localization-service";
export {
  createNotificationService,
  type NotificationDecision,
  type NotificationPreferences,
  type NotificationRequest,
  type NotificationService,
} from "./notification-service";
export { createPlaybackService, type PlaybackService } from "./playback-service";
export {
  createPresenceService,
  type PresenceObservation,
  type PresenceService,
} from "./presence-service";
export { createProviderService, type ProviderService } from "./provider-service";
export { createRoomService, type CreateRoomInput, type RoomService } from "./room-service";
export { createSyncService, type ClockSample, type SyncService } from "./sync-service";
export { createUserService, type UserService } from "./user-service";
export { createVoiceService, type VoiceService } from "./voice-service";
export type { DomainServiceContext, Intent } from "./service-context";

export {
  ANALYTICS_SERVICE,
  CLOCK,
  DEEP_LINK_SERVICE,
  COMPLIANCE_SERVICE,
  EVENT_BUS,
  FEATURE_FLAG_SERVICE,
  INVITATION_SERVICE,
  LOCALIZATION_SERVICE,
  NOTIFICATION_SERVICE,
  PLAYBACK_SERVICE,
  PRESENCE_SERVICE,
  PROVIDER_SERVICE,
  registerDomainServices,
  ROOM_FLOW_SERVICE,
  ROOM_SERVICE,
  SYNC_SERVICE,
  USER_SERVICE,
  VOICE_SERVICE,
  type DomainServiceOptions,
} from "./domain-services";
