/**
 * Domain enums — Sprint 1.6.
 *
 * Build Rules §16: enum values are mirrored between application constants and
 * the database check constraints. Transcribed verbatim from Database
 * Specification v1.0 §5; nothing is added, reordered, or renamed here.
 */

export const ROOM_STATUSES = ["lobby", "active", "paused", "ended", "abandoned"] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const ROOM_VISIBILITIES = ["private", "link", "public", "community"] as const;
export type RoomVisibility = (typeof ROOM_VISIBILITIES)[number];

export const ROOM_ROLES = ["host", "co_host", "guest"] as const;
export type RoomRole = (typeof ROOM_ROLES)[number];

export const MEMBERSHIP_STATES = ["invited", "joined", "left", "removed"] as const;
export type MembershipState = (typeof MEMBERSHIP_STATES)[number];

export const PRESENCE_STATUSES = [
  "online",
  "idle",
  "buffering",
  "disconnected",
  "offline",
] as const;
export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];

export const PLAYBACK_STATUSES = [
  "idle",
  "ready",
  "counting_down",
  "playing",
  "paused",
  "buffering",
  "ended",
] as const;
export type PlaybackStatus = (typeof PLAYBACK_STATUSES)[number];

export const SYNC_MODES = ["controlled", "manual"] as const;
export type SyncMode = (typeof SYNC_MODES)[number];

export const SESSION_END_REASONS = [
  "completed",
  "host_ended",
  "all_left",
  "timeout",
  "error",
] as const;
export type SessionEndReason = (typeof SESSION_END_REASONS)[number];

export const INVITE_STATUSES = ["pending", "accepted", "declined", "expired", "revoked"] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const INVITE_CHANNELS = ["in_app", "link"] as const;
export type InviteChannel = (typeof INVITE_CHANNELS)[number];

export const NOTIFICATION_TYPES = [
  "room_invite",
  "invite_accepted",
  "room_starting",
  "countdown_started",
  "member_joined",
  "member_left",
  "voice_started",
  "provider_status_changed",
  "system_announcement",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** `push` is reserved and emitted by no v1 code path (ADR-007). */
export const NOTIFICATION_CHANNELS = ["in_app", "push", "email"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const DELIVERY_STATUSES = ["queued", "sent", "delivered", "failed", "suppressed"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const VOICE_STATUSES = ["provisioning", "active", "degraded", "ended", "failed"] as const;
export type VoiceStatus = (typeof VOICE_STATUSES)[number];

export const VOICE_PARTICIPANT_STATUSES = [
  "connecting",
  "connected",
  "reconnecting",
  "disconnected",
] as const;
export type VoiceParticipantStatus = (typeof VOICE_PARTICIPANT_STATUSES)[number];

export const CONNECTION_QUALITIES = ["excellent", "good", "poor", "unknown"] as const;
export type ConnectionQuality = (typeof CONNECTION_QUALITIES)[number];

export const PROVIDER_CATEGORIES = ["ott", "video_platform", "local_media", "other"] as const;
export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

export const PROVIDER_CAPABILITIES = [
  "play_pause",
  "seek",
  "deep_link",
  "position_read",
  "embed",
  "local_playback",
] as const;
export type ProviderCapability = (typeof PROVIDER_CAPABILITIES)[number];

export const CAPABILITY_SUPPORT_LEVELS = [
  "supported",
  "manual_sync",
  "experimental",
  "unverified",
  "unavailable",
] as const;
export type CapabilitySupportLevel = (typeof CAPABILITY_SUPPORT_LEVELS)[number];

export const PROVIDER_STATUSES = [
  "available",
  "degraded",
  "manual_only",
  "unavailable",
  "retired",
] as const;
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export const COMPLIANCE_ACTIONS = ["allow", "manual_only", "warn", "block"] as const;
export type ComplianceAction = (typeof COMPLIANCE_ACTIONS)[number];

export const COMPLIANCE_SCOPES = ["global", "region"] as const;
export type ComplianceScope = (typeof COMPLIANCE_SCOPES)[number];

export const FEATURE_FLAG_STATES = ["off", "on", "internal", "percentage", "targeted"] as const;
export type FeatureFlagState = (typeof FEATURE_FLAG_STATES)[number];

export const ASSIGNMENT_SOURCES = ["manual", "percentage_bucket", "internal_tester"] as const;
export type AssignmentSource = (typeof ASSIGNMENT_SOURCES)[number];

export const VISIBILITY_SCOPES = ["everyone", "recent_partners", "nobody"] as const;
export type VisibilityScope = (typeof VISIBILITY_SCOPES)[number];

export const PROFILE_STATUSES = ["active", "suspended", "deactivated", "deleted"] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];
