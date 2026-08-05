/**
 * Onboarding wizard — Milestone E.
 *
 * First-run setup in six short steps: welcome, name, avatar mark, language,
 * preferred services, accessibility. Nothing here decides anything: the handle
 * rules belong to `ProfileService`, the provider catalogue to
 * `ProviderCatalogService`, and accessibility reflection to the accessibility
 * provider. This is a form with a progress bar.
 *
 * Po appears at each step as encouragement, never as an assistant (Po Rule).
 */
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";

import {
  ActionButton,
  Avatar,
  AVATAR_PRESETS,
  Surface,
  TextField,
  type AvatarPreset,
} from "@/design-system/components";
import { claimDestination, validateDisplayName } from "@/features/auth";
import { PoCompanion, type PoMood } from "@/features/po";
import { useProviderCatalog } from "@/features/providers";
import { useAccessibility } from "@/foundation/accessibility";
import { useLocalization, useTranslation } from "@/foundation/localization";
import type { LocaleCode } from "@/shared/constants/locales";
import { LOCAL_PREFERENCE_KEYS, writeLocalPreference } from "@/foundation/preferences";
import { cn } from "@/lib/utils";

import { useProfile } from "../use-profile";

const STEPS = ["welcome", "name", "avatar", "language", "providers", "accessibility"] as const;
type Step = (typeof STEPS)[number];

const STEP_MOOD: Record<Step, PoMood> = {
  welcome: "happy",
  name: "calm",
  avatar: "focused",
  language: "thinking",
  providers: "observing",
  accessibility: "encouraging",
};

export function OnboardingWizard({
  profileId,
  initialName,
}: {
  profileId: string | null;
  initialName: string;
}) {
  const { t } = useTranslation();
  const { locale, availableLocales, setLocale } = useLocalization();
  const accessibility = useAccessibility();
  const navigate = useNavigate();
  const profile = useProfile(profileId);
  const catalog = useProviderCatalog(profileId);

  const [stepIndex, setStepIndex] = useState(0);
  const [displayName, setDisplayName] = useState(initialName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [preset, setPreset] = useState<AvatarPreset>(AVATAR_PRESETS[0]);
  const [favorites, setFavorites] = useState<readonly string[]>([]);

  const step = STEPS[stepIndex] as Step;
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  function next() {
    if (step === "name") {
      const key = validateDisplayName(displayName);
      setNameError(key ? t(key) : null);
      if (key) return;
    }
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  }

  function back() {
    setStepIndex((index) => Math.max(index - 1, 0));
  }

  // Onboarding may be completed from two places (Skip and Finish). A second
  // submission while the first is in flight duplicates the profile write and
  // surfaces as a conflict, so entry is guarded here.
  const finishing = useRef(false);

  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    const name = displayName.trim();
    const ok = await profile.completeOnboarding({
      displayName: name,
      handle: profile.suggestHandle(name),
      avatarPreset: preset,
      locale,
      timezone,
    });

    // Onboarding is complete for this device even when persistence is not
    // configured; the profile write is the authority, this is only a hint.
    writeLocalPreference(LOCAL_PREFERENCE_KEYS.ONBOARDING, ok ? "complete" : "skipped");
    const destination = claimDestination() ?? "/home";
    finishing.current = false;
    void navigate({ to: destination, replace: true });
  }

  function toggleFavorite(providerId: string) {
    setFavorites((current) =>
      current.includes(providerId)
        ? current.filter((id) => id !== providerId)
        : [...current, providerId],
    );
    catalog.toggleFavorite(providerId, !favorites.includes(providerId));
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 pb-28 sm:px-6 md:pb-14">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("onboarding.step_of", { current: stepIndex + 1, total: STEPS.length })}
        </p>
        <button
          type="button"
          onClick={() => void finish()}
          className="min-h-11 rounded-xl px-3 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t("onboarding.action.skip")}
        </button>
      </div>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("onboarding.progress")}
      >
        <span
          className="block h-full rounded-full bg-primary transition-[width] duration-normal ease-standard"
          style={{ width: `${progress}%` }}
        />
      </div>

      <Surface tone="glass" padding="lg" className="mt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {t(`onboarding.${step}.title`)}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(`onboarding.${step}.description`)}
            </p>
          </div>
          <PoCompanion mood={STEP_MOOD[step]} className="hidden h-24 w-32 shrink-0 sm:block" />
        </div>

        <div className="mt-6 space-y-4">
          {step === "welcome" ? (
            <ul className="space-y-3 text-sm text-muted-foreground">
              {["accounts", "countdown", "voice"].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-1.5 size-1.5 rounded-full bg-primary" />
                  <span>{t(`auth.story.point.${point}`)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {step === "name" ? (
            <TextField
              label={t("onboarding.name.label")}
              value={displayName}
              error={nameError}
              autoComplete="nickname"
              maxLength={40}
              description={t("onboarding.name.hint", {
                handle: profile.suggestHandle(displayName || "streamflow"),
              })}
              onChange={(event) => {
                setDisplayName(event.target.value);
                if (nameError) setNameError(null);
              }}
            />
          ) : null}

          {step === "avatar" ? (
            <fieldset>
              <legend className="sr-only">{t("onboarding.avatar.title")}</legend>
              <div className="flex flex-wrap gap-3">
                {AVATAR_PRESETS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={preset === option}
                    onClick={() => setPreset(option)}
                    className={cn(
                      "rounded-full p-1 transition-transform",
                      preset === option
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "opacity-80 hover:opacity-100",
                    )}
                  >
                    <Avatar name={displayName || "SF"} preset={option} size="lg" />
                    <span className="sr-only">{t(`onboarding.avatar.preset.${option}`)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {step === "language" ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t("settings.language.label")}</legend>
              {availableLocales.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  aria-pressed={locale === option.code}
                  onClick={() => setLocale(option.code as LocaleCode)}
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
            </fieldset>
          ) : null}

          {step === "providers" ? (
            <div className="space-y-2">
              {catalog.options.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("home.providers.unavailable.description")}
                </p>
              ) : (
                catalog.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={favorites.includes(option.id)}
                    onClick={() => toggleFavorite(option.id)}
                    className={cn(
                      "flex min-h-14 w-full items-center justify-between rounded-xl border px-4 text-left text-sm transition-colors",
                      favorites.includes(option.id)
                        ? "border-primary bg-accent"
                        : "border-border hover:bg-accent/60",
                    )}
                  >
                    <span className="font-medium">{t(option.nameKey)}</span>
                    <span className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
                      {t(`provider.class.${option.selectionClass}`)}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {step === "accessibility" ? (
            <div className="space-y-2">
              <ToggleRow
                label={t("settings.accessibility.reduced_motion")}
                checked={accessibility.prefersReducedMotion}
                onChange={(value) => accessibility.setReducedMotion(value)}
              />
              <ToggleRow
                label={t("settings.accessibility.high_contrast")}
                checked={accessibility.contrast === "high"}
                onChange={(value) => accessibility.setContrast(value ? "high" : "default")}
              />
              <p className="pt-2 text-xs text-muted-foreground">
                {t("onboarding.accessibility.hint")}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex gap-3">
          {stepIndex > 0 ? (
            <ActionButton tone="ghost" onClick={back} className="flex-1">
              {t("onboarding.action.back")}
            </ActionButton>
          ) : null}

          {stepIndex < STEPS.length - 1 ? (
            <ActionButton onClick={next} className="flex-1">
              {t("onboarding.action.next")}
            </ActionButton>
          ) : (
            <ActionButton
              loading={profile.isSaving}
              onClick={() => void finish()}
              className="flex-1"
            >
              {t("onboarding.action.finish")}
            </ActionButton>
          )}
        </div>
      </Surface>
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
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-border px-4 text-left text-sm transition-colors hover:bg-accent/60"
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
