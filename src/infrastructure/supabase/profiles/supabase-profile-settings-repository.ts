/**
 * Supabase settings adapter — Milestone E.
 *
 * Five preference aggregates are read in parallel and written with upserts, so
 * a profile that has never opened settings behaves exactly like one that has.
 * The neutral contract hides the fact that this is five tables and not one.
 */
import type {
  EntityId,
  ProfileSettingsPatch,
  ProfileSettingsRecord,
  ProfileSettingsRepository,
} from "@/repository";

import type { DataConnection } from "../connection";
import { runCommand, runMaybe } from "../query-wrapper";
import { requireAvailable } from "../rooms/room-query-support";
import {
  ACCESSIBILITY_DEFAULTS,
  APPEARANCE_DEFAULTS,
  LOCALIZATION_DEFAULTS,
  NOTIFICATION_DEFAULTS,
  PRIVACY_DEFAULTS,
} from "./profile-mapper";

const AGGREGATE = "profile_settings";

interface AppearanceRow {
  theme_mode: string;
  density: string;
  compact_room_layout: boolean;
}
interface NotificationRow {
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}
interface PrivacyRow {
  presence_visibility: string;
  allow_invites_from: string;
  analytics_opt_in: boolean;
  po_memory_opt_in: boolean;
  voice_auto_join: boolean;
  voice_join_muted: boolean;
  voice_push_to_talk: boolean;
  default_provider_id: string | null;
}
interface LocalizationRow {
  language_code: string;
  region_code: string | null;
  auto_detect_enabled: boolean;
  time_format_24h: boolean;
}
interface AccessibilityRow {
  mode: string;
  reduced_motion: boolean;
  high_contrast: boolean;
  font_scale: number;
  captions_default_on: boolean;
  screen_reader_hints_enabled: boolean;
}

export function createSupabaseProfileSettingsRepository(
  connection: DataConnection,
): ProfileSettingsRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  /**
   * The five preference tables share one column shape from this adapter's point
   * of view, so they are addressed through a structural accessor. The generated
   * per-table union cannot express "any of these five", and widening it here
   * keeps the five near-identical query blocks from being written out longhand.
   */
  const access = (): PreferenceTableAccess =>
    connection.client() as unknown as PreferenceTableAccess;

  async function read(profileId: EntityId): Promise<ProfileSettingsRecord> {
    requireAvailable(connection, context("read", profileId));
    const client = access();
    const scoped = <T>(table: string, columns: string) =>
      runMaybe<T | null>(
        client.from(table).select(columns).eq("profile_id", profileId).maybeSingle() as PromiseLike<
          PostgrestLike<T | null>
        >,
        context(`read:${table}`, profileId),
      );


    const [appearance, notifications, privacy, localization, accessibility] = await Promise.all([
      scoped<AppearanceRow>("appearance_preferences", "theme_mode, density, compact_room_layout"),
      scoped<NotificationRow>(
        "notification_preferences",
        "in_app_enabled, push_enabled, email_enabled, quiet_hours_start, quiet_hours_end",
      ),
      scoped<PrivacyRow>(
        "privacy_preferences",
        "presence_visibility, allow_invites_from, analytics_opt_in, po_memory_opt_in, voice_auto_join, voice_join_muted, voice_push_to_talk, default_provider_id",
      ),
      scoped<LocalizationRow>(
        "localization_preferences",
        "language_code, region_code, auto_detect_enabled, time_format_24h",
      ),
      scoped<AccessibilityRow>(
        "accessibility_preferences",
        "mode, reduced_motion, high_contrast, font_scale, captions_default_on, screen_reader_hints_enabled",
      ),
    ]);

    return Object.freeze({
      appearance: appearance
        ? {
            themeMode: appearance.theme_mode,
            density: appearance.density,
            compactRoomLayout: appearance.compact_room_layout,
          }
        : APPEARANCE_DEFAULTS,
      notifications: notifications
        ? {
            inAppEnabled: notifications.in_app_enabled,
            pushEnabled: notifications.push_enabled,
            emailEnabled: notifications.email_enabled,
            quietHoursStart: notifications.quiet_hours_start,
            quietHoursEnd: notifications.quiet_hours_end,
          }
        : NOTIFICATION_DEFAULTS,
      privacy: privacy
        ? {
            presenceVisibility: privacy.presence_visibility,
            allowInvitesFrom: privacy.allow_invites_from,
            analyticsOptIn: privacy.analytics_opt_in,
            poMemoryOptIn: privacy.po_memory_opt_in,
            voiceAutoJoin: privacy.voice_auto_join,
            voiceJoinMuted: privacy.voice_join_muted,
            voicePushToTalk: privacy.voice_push_to_talk,
            defaultProviderId: privacy.default_provider_id,
          }
        : PRIVACY_DEFAULTS,
      localization: localization
        ? {
            languageCode: localization.language_code,
            regionCode: localization.region_code,
            autoDetectEnabled: localization.auto_detect_enabled,
            timeFormat24h: localization.time_format_24h,
          }
        : LOCALIZATION_DEFAULTS,
      accessibility: accessibility
        ? {
            mode: accessibility.mode,
            reducedMotion: accessibility.reduced_motion,
            highContrast: accessibility.high_contrast,
            fontScale: accessibility.font_scale,
            captionsDefaultOn: accessibility.captions_default_on,
            screenReaderHintsEnabled: accessibility.screen_reader_hints_enabled,
          }
        : ACCESSIBILITY_DEFAULTS,
    });
  }

  return {
    read,

    async write(profileId: EntityId, patch: ProfileSettingsPatch): Promise<ProfileSettingsRecord> {
      requireAvailable(connection, context("write", profileId));
      const client = connection.client();
      const now = new Date().toISOString();
      const upsert = (table: string, values: Record<string, unknown>) =>
        runCommand(
          client
            .from(table)
            .upsert({ profile_id: profileId, ...values, updated_at: now }, {
              onConflict: "profile_id",
            }),
          context(`write:${table}`, profileId),
        );

      const writes: Promise<void>[] = [];

      if (patch.appearance) {
        const value = patch.appearance;
        writes.push(
          upsert("appearance_preferences", {
            ...(value.themeMode === undefined ? {} : { theme_mode: value.themeMode }),
            ...(value.density === undefined ? {} : { density: value.density }),
            ...(value.compactRoomLayout === undefined
              ? {}
              : { compact_room_layout: value.compactRoomLayout }),
          }),
        );
      }

      if (patch.notifications) {
        const value = patch.notifications;
        writes.push(
          upsert("notification_preferences", {
            ...(value.inAppEnabled === undefined ? {} : { in_app_enabled: value.inAppEnabled }),
            ...(value.pushEnabled === undefined ? {} : { push_enabled: value.pushEnabled }),
            ...(value.emailEnabled === undefined ? {} : { email_enabled: value.emailEnabled }),
            ...(value.quietHoursStart === undefined
              ? {}
              : { quiet_hours_start: value.quietHoursStart }),
            ...(value.quietHoursEnd === undefined ? {} : { quiet_hours_end: value.quietHoursEnd }),
          }),
        );
      }

      if (patch.privacy) {
        const value = patch.privacy;
        writes.push(
          upsert("privacy_preferences", {
            ...(value.presenceVisibility === undefined
              ? {}
              : { presence_visibility: value.presenceVisibility }),
            ...(value.allowInvitesFrom === undefined
              ? {}
              : { allow_invites_from: value.allowInvitesFrom }),
            ...(value.analyticsOptIn === undefined
              ? {}
              : { analytics_opt_in: value.analyticsOptIn }),
            ...(value.poMemoryOptIn === undefined
              ? {}
              : { po_memory_opt_in: value.poMemoryOptIn }),
            ...(value.voiceAutoJoin === undefined ? {} : { voice_auto_join: value.voiceAutoJoin }),
            ...(value.voiceJoinMuted === undefined
              ? {}
              : { voice_join_muted: value.voiceJoinMuted }),
            ...(value.voicePushToTalk === undefined
              ? {}
              : { voice_push_to_talk: value.voicePushToTalk }),
            ...(value.defaultProviderId === undefined
              ? {}
              : { default_provider_id: value.defaultProviderId }),
          }),
        );
      }

      if (patch.localization) {
        const value = patch.localization;
        writes.push(
          upsert("localization_preferences", {
            ...(value.languageCode === undefined ? {} : { language_code: value.languageCode }),
            ...(value.regionCode === undefined ? {} : { region_code: value.regionCode }),
            ...(value.autoDetectEnabled === undefined
              ? {}
              : { auto_detect_enabled: value.autoDetectEnabled }),
            ...(value.timeFormat24h === undefined ? {} : { time_format_24h: value.timeFormat24h }),
          }),
        );
      }

      if (patch.accessibility) {
        const value = patch.accessibility;
        writes.push(
          upsert("accessibility_preferences", {
            ...(value.mode === undefined ? {} : { mode: value.mode }),
            ...(value.reducedMotion === undefined ? {} : { reduced_motion: value.reducedMotion }),
            ...(value.highContrast === undefined ? {} : { high_contrast: value.highContrast }),
            ...(value.fontScale === undefined ? {} : { font_scale: value.fontScale }),
            ...(value.captionsDefaultOn === undefined
              ? {}
              : { captions_default_on: value.captionsDefaultOn }),
            ...(value.screenReaderHintsEnabled === undefined
              ? {}
              : { screen_reader_hints_enabled: value.screenReaderHintsEnabled }),
          }),
        );
      }

      await Promise.all(writes);
      return read(profileId);
    },
  };
}
