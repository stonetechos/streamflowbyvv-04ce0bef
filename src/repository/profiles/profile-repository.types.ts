/**
 * Profile persistence contracts — Milestone E, Foundation §5.
 *
 * Sprints 1.4–1.5 gave the application an identity: who is signed in. They
 * deliberately did not give it a profile it can edit, because nothing needed
 * one yet. The consumer experience does: onboarding writes a display name and
 * an avatar mark, and the settings screen writes preferences that live in five
 * separate preference aggregates (Database Spec §3.1).
 *
 * Expressed entirely in Domain terms — no table name, column name or driver
 * type appears here.
 */
import type { EntityCode, EntityId } from "@/repository/repository.types";
import { createRepositoryToken, type RepositoryToken } from "@/repository/repository-registry";

/**
 * The editable view of a profile. Notably absent: `authUserId`. That column is
 * the single point of identity-provider coupling (Database Spec §2) and no
 * layer above Repository has a reason to read it.
 */
export interface ProfileRecord {
  readonly id: EntityId;
  readonly code: EntityCode;
  readonly displayName: string;
  readonly handle: string;
  readonly bio: string | null;
  /** Name of a generated avatar preset, never an uploaded file URL in v1. */
  readonly avatarPreset: string | null;
  readonly locale: string;
  readonly timezone: string;
  readonly status: string;
  /** Null until first-run setup has been completed at least once. */
  readonly onboardingCompletedAt: string | null;
  readonly createdAt: string;
}

export interface ProfileRecordPatch {
  readonly displayName?: string;
  readonly handle?: string;
  readonly bio?: string | null;
  readonly avatarPreset?: string | null;
  readonly locale?: string;
  readonly timezone?: string;
  readonly onboardingCompletedAt?: string | null;
}

export interface ProfileRepository {
  findById(profileId: EntityId): Promise<ProfileRecord | null>;
  /** Used by the handle-availability check during onboarding. */
  findByHandle(handle: string): Promise<ProfileRecord | null>;
  update(profileId: EntityId, patch: ProfileRecordPatch): Promise<ProfileRecord>;
}

/** Appearance — Database Spec §3.1 `appearance_preferences`. */
export interface AppearancePreferencesRecord {
  readonly themeMode: string;
  readonly density: string;
  readonly compactRoomLayout: boolean;
}

/** Notifications — Database Spec §3.1, ADR-007 (channel model). */
export interface NotificationPreferencesRecord {
  readonly inAppEnabled: boolean;
  readonly pushEnabled: boolean;
  readonly emailEnabled: boolean;
  readonly quietHoursStart: string | null;
  readonly quietHoursEnd: string | null;
}

/** Privacy, voice defaults and Po memory consent — Database Spec §3.1. */
export interface PrivacyPreferencesRecord {
  readonly presenceVisibility: string;
  readonly allowInvitesFrom: string;
  readonly analyticsOptIn: boolean;
  readonly poMemoryOptIn: boolean;
  readonly voiceAutoJoin: boolean;
  readonly voiceJoinMuted: boolean;
  readonly voicePushToTalk: boolean;
  readonly defaultProviderId: EntityId | null;
}

/** Language and region — Database Spec §3.1 `localization_preferences`. */
export interface LocalizationPreferencesRecord {
  readonly languageCode: string;
  readonly regionCode: string | null;
  readonly autoDetectEnabled: boolean;
  readonly timeFormat24h: boolean;
}

/** Accessibility — Database Spec §3.1, MVP §12. */
export interface AccessibilityPreferencesRecord {
  readonly mode: string;
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;
  readonly fontScale: number;
  readonly captionsDefaultOn: boolean;
  readonly screenReaderHintsEnabled: boolean;
}

/** Everything the settings screen reads, in one shape. */
export interface ProfileSettingsRecord {
  readonly appearance: AppearancePreferencesRecord;
  readonly notifications: NotificationPreferencesRecord;
  readonly privacy: PrivacyPreferencesRecord;
  readonly localization: LocalizationPreferencesRecord;
  readonly accessibility: AccessibilityPreferencesRecord;
}

/** Every group is optional; only supplied groups are written. */
export interface ProfileSettingsPatch {
  readonly appearance?: Partial<AppearancePreferencesRecord>;
  readonly notifications?: Partial<NotificationPreferencesRecord>;
  readonly privacy?: Partial<PrivacyPreferencesRecord>;
  readonly localization?: Partial<LocalizationPreferencesRecord>;
  readonly accessibility?: Partial<AccessibilityPreferencesRecord>;
}

/**
 * Preference aggregates are read and written as a set, because the settings
 * screen presents them as one. Rows are created on first write, so a profile
 * with no preference rows reads as the documented defaults rather than as an
 * error.
 */
export interface ProfileSettingsRepository {
  read(profileId: EntityId): Promise<ProfileSettingsRecord>;
  write(profileId: EntityId, patch: ProfileSettingsPatch): Promise<ProfileSettingsRecord>;
}

export const PROFILE_REPOSITORY: RepositoryToken<ProfileRepository> =
  createRepositoryToken<ProfileRepository>("ProfileRepository");

export const PROFILE_SETTINGS_REPOSITORY: RepositoryToken<ProfileSettingsRepository> =
  createRepositoryToken<ProfileSettingsRepository>("ProfileSettingsRepository");
