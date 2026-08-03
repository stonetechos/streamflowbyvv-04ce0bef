/**
 * Profile row mapping — Milestone E.
 *
 * The only place that knows `profiles` has a column called `avatar_url` or
 * that preference defaults are expressed as SQL defaults. Rows in, neutral
 * records out (Sprint 1.3 §4).
 *
 * v1 stores a generated avatar preset name in `avatar_url`. The column is
 * reused rather than added because the value is still "how to draw this
 * person's mark"; when uploads arrive, the same column holds a URL and only
 * this mapper changes.
 */
import type {
  AccessibilityPreferencesRecord,
  AppearancePreferencesRecord,
  LocalizationPreferencesRecord,
  NotificationPreferencesRecord,
  PrivacyPreferencesRecord,
  ProfileRecord,
} from "@/repository";

export const PROFILE_COLUMNS =
  "id, code, display_name, handle, bio, avatar_url, locale, timezone, status, onboarding_completed_at, created_at";

export interface ProfileRow {
  id: string;
  code: string;
  display_name: string;
  handle: string;
  bio: string | null;
  avatar_url: string | null;
  locale: string;
  timezone: string;
  status: string;
  onboarding_completed_at: string | null;
  created_at: string;
}

export function toProfileRecord(row: ProfileRow): ProfileRecord {
  return Object.freeze({
    id: row.id,
    code: row.code,
    displayName: row.display_name,
    handle: row.handle,
    bio: row.bio,
    avatarPreset: row.avatar_url,
    locale: row.locale,
    timezone: row.timezone,
    status: row.status,
    onboardingCompletedAt: row.onboarding_completed_at,
    createdAt: row.created_at,
  });
}

/**
 * Documented defaults, returned when a preference row has never been written.
 * They mirror the SQL defaults in the Sprint 1.2 migrations; a missing row and
 * a default row must be indistinguishable to the rest of the application.
 */
export const APPEARANCE_DEFAULTS: AppearancePreferencesRecord = Object.freeze({
  themeMode: "system",
  density: "comfortable",
  compactRoomLayout: false,
});

export const NOTIFICATION_DEFAULTS: NotificationPreferencesRecord = Object.freeze({
  inAppEnabled: true,
  pushEnabled: false,
  emailEnabled: true,
  quietHoursStart: null,
  quietHoursEnd: null,
});

export const PRIVACY_DEFAULTS: PrivacyPreferencesRecord = Object.freeze({
  presenceVisibility: "recent_partners",
  allowInvitesFrom: "recent_partners",
  analyticsOptIn: false,
  poMemoryOptIn: false,
  voiceAutoJoin: false,
  voiceJoinMuted: true,
  voicePushToTalk: false,
  defaultProviderId: null,
});

export const LOCALIZATION_DEFAULTS: LocalizationPreferencesRecord = Object.freeze({
  languageCode: "en",
  regionCode: null,
  autoDetectEnabled: true,
  timeFormat24h: false,
});

export const ACCESSIBILITY_DEFAULTS: AccessibilityPreferencesRecord = Object.freeze({
  mode: "standard",
  reducedMotion: false,
  highContrast: false,
  fontScale: 1,
  captionsDefaultOn: false,
  screenReaderHintsEnabled: false,
});
