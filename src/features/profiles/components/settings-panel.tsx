/**
 * Settings panel — Milestone E.
 *
 * Every preference the MVP exposes, grouped by the five aggregates that
 * `ProfileService` owns: appearance, notifications, privacy, localization and
 * accessibility. The panel never invents a default — it renders what the
 * service returned and sends patches back.
 */
import { useState } from "react";

import {
  ActionButton,
  Avatar,
  AVATAR_PRESETS,
  SectionHeader,
  Skeleton,
  Surface,
  TextField,
  type AvatarPreset,
} from "@/design-system/components";
import { validateDisplayName } from "@/features/auth";
import { VoiceSettingsSection } from "@/features/voice";
import { useAccessibility } from "@/foundation/accessibility";
import { useLocalization, useTranslation } from "@/foundation/localization";
import { THEME_CHOICES, useTheme } from "@/foundation/theme";
import type { LocaleCode } from "@/shared/constants/locales";
import { cn } from "@/lib/utils";

import { useProfile } from "../use-profile";

export function SettingsPanel({ profileId }: { profileId: string | null }) {
  const { t } = useTranslation();
  const { locale, availableLocales, setLocale } = useLocalization();
  const accessibility = useAccessibility();
  const { theme, setTheme } = useTheme();
  const profile = useProfile(profileId);

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const record = profile.profile;
  const settings = profile.settings;
  const nameValue = displayName ?? record?.displayName ?? "";

  async function saveIdentity() {
    const key = validateDisplayName(nameValue);
    setNameError(key ? t(key) : null);
    if (key) return;
    await profile.saveProfile({ displayName: nameValue.trim() });
  }

  if (profile.isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label={t("common.state.loading")}>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!profile.isAvailable ? (
        <Surface padding="md" tone="card">
          <p className="text-sm text-muted-foreground">{t("settings.unavailable")}</p>
        </Surface>
      ) : null}

      <section className="space-y-4">
        <SectionHeader
          title={t("settings.identity.title")}
          description={t("settings.identity.description")}
        />
        <Surface tone="glass" padding="lg" className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar
              name={nameValue || "SF"}
              preset={(record?.avatarPreset as AvatarPreset | undefined) ?? AVATAR_PRESETS[0]}
              size="lg"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold">
                {nameValue || t("settings.identity.unnamed")}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                @{record?.handle ?? profile.suggestHandle(nameValue || "streamflow")}
              </p>
            </div>
          </div>

          <TextField
            label={t("settings.identity.display_name")}
            value={nameValue}
            error={nameError}
            maxLength={40}
            autoComplete="nickname"
            onChange={(event) => {
              setDisplayName(event.target.value);
              if (nameError) setNameError(null);
            }}
          />

          <div className="flex flex-wrap gap-3">
            {AVATAR_PRESETS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={record?.avatarPreset === option}
                onClick={() => void profile.saveProfile({ avatarPreset: option })}
                className={cn(
                  "rounded-full p-1 transition-opacity",
                  record?.avatarPreset === option
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "opacity-80 hover:opacity-100",
                )}
              >
                <Avatar name={nameValue || "SF"} preset={option} size="md" />
                <span className="sr-only">{t(`onboarding.avatar.preset.${option}`)}</span>
              </button>
            ))}
          </div>

          <ActionButton loading={profile.isSaving} onClick={() => void saveIdentity()}>
            {t("common.action.save")}
          </ActionButton>
        </Surface>
      </section>

      <section className="space-y-4">
        <SectionHeader title={t("settings.appearance.title")} />
        <Surface padding="lg" className="space-y-3">
          <fieldset>
            <legend className="text-sm font-medium">{t("settings.appearance.theme")}</legend>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {THEME_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={theme === choice}
                  onClick={() => setTheme(choice)}
                  className={cn(
                    "min-h-12 rounded-xl border text-sm font-medium transition-colors",
                    theme === choice
                      ? "border-primary bg-accent"
                      : "border-border hover:bg-accent/60",
                  )}
                >
                  {t(`settings.appearance.theme.${choice}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <ToggleRow
            label={t("settings.appearance.compact")}
            checked={settings?.appearance.compactRoomLayout ?? false}
            onChange={(value) =>
              void profile.saveSettings({ appearance: { compactRoomLayout: value } })
            }
          />
        </Surface>
      </section>

      <section className="space-y-4">
        <SectionHeader title={t("settings.notifications.title")} />
        <Surface padding="lg" className="space-y-2">
          <ToggleRow
            label={t("settings.notifications.in_app")}
            checked={settings?.notifications.inAppEnabled ?? true}
            onChange={(value) =>
              void profile.saveSettings({ notifications: { inAppEnabled: value } })
            }
          />
          <ToggleRow
            label={t("settings.notifications.push")}
            checked={settings?.notifications.pushEnabled ?? false}
            onChange={(value) =>
              void profile.saveSettings({ notifications: { pushEnabled: value } })
            }
          />
          <ToggleRow
            label={t("settings.notifications.email")}
            checked={settings?.notifications.emailEnabled ?? false}
            onChange={(value) =>
              void profile.saveSettings({ notifications: { emailEnabled: value } })
            }
          />
        </Surface>
      </section>

      <section className="space-y-4">
        <SectionHeader title={t("settings.privacy.title")} />
        <Surface padding="lg" className="space-y-2">
          <ToggleRow
            label={t("settings.privacy.presence")}
            checked={(settings?.privacy.presenceVisibility ?? "friends") !== "hidden"}
            onChange={(value) =>
              void profile.saveSettings({
                privacy: { presenceVisibility: value ? "friends" : "hidden" },
              })
            }
          />
          <ToggleRow
            label={t("settings.privacy.invites_from_anyone")}
            checked={(settings?.privacy.allowInvitesFrom ?? "friends") === "anyone"}
            onChange={(value) =>
              void profile.saveSettings({
                privacy: { allowInvitesFrom: value ? "anyone" : "friends" },
              })
            }
          />
          <ToggleRow
            label={t("settings.privacy.analytics")}
            checked={settings?.privacy.analyticsOptIn ?? false}
            onChange={(value) => void profile.saveSettings({ privacy: { analyticsOptIn: value } })}
          />
        </Surface>
      </section>

      {/* Milestone G — voice. Devices are local to this machine; the three
          behaviour switches live in the privacy aggregate. */}
      <VoiceSettingsSection
        autoJoin={settings?.privacy.voiceAutoJoin ?? false}
        joinMuted={settings?.privacy.voiceJoinMuted ?? true}
        pushToTalk={settings?.privacy.voicePushToTalk ?? false}
        onChange={(patch) => void profile.saveSettings({ privacy: patch })}
      />

      <section className="space-y-4">
        <SectionHeader title={t("settings.language.title")} />
        <Surface padding="lg" className="space-y-2">
          {availableLocales.map((option) => (
            <button
              key={option.code}
              type="button"
              aria-pressed={locale === option.code}
              onClick={() => {
                setLocale(option.code as LocaleCode);
                void profile.saveSettings({ localization: { languageCode: option.code } });
              }}
              className={cn(
                "flex min-h-14 w-full items-center justify-between rounded-xl border px-4 text-left text-sm transition-colors",
                locale === option.code
                  ? "border-primary bg-accent"
                  : "border-border hover:bg-accent/60",
              )}
            >
              <span className="font-medium">{option.nativeName}</span>
              <span className="font-mono text-xs text-muted-foreground">{option.code}</span>
            </button>
          ))}
        </Surface>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title={t("settings.accessibility.title")}
          description={t("settings.accessibility.description")}
        />
        <Surface padding="lg" className="space-y-2">
          <ToggleRow
            label={t("settings.accessibility.reduced_motion")}
            checked={accessibility.prefersReducedMotion}
            onChange={(value) => {
              accessibility.setReducedMotion(value);
              void profile.saveSettings({ accessibility: { reducedMotion: value } });
            }}
          />
          <ToggleRow
            label={t("settings.accessibility.high_contrast")}
            checked={accessibility.contrast === "high"}
            onChange={(value) => {
              accessibility.setContrast(value ? "high" : "default");
              void profile.saveSettings({ accessibility: { highContrast: value } });
            }}
          />
        </Surface>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl px-2 text-left text-sm transition-colors hover:bg-accent/60"
    >
      <span className="font-medium">{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-background transition-[left] duration-fast",
            checked ? "left-[1.375rem]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
