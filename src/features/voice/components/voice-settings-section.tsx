/**
 * Voice settings — Milestone G.
 *
 * The voice half of the settings screen. It reads and writes the existing
 * privacy/voice preference aggregate (`voiceAutoJoin`, `voiceJoinMuted`,
 * `voicePushToTalk`); device choices are per-device and therefore local.
 *
 * Three switches are deliberately inert placeholders — push-to-talk, noise
 * suppression, and echo cancellation are transport capabilities the MVP does
 * not expose yet. They are shown disabled with an explanatory caption rather
 * than pretending to work.
 */
import { SectionHeader, Surface } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import { useVoiceDevices } from "../use-voice-devices";
import {
  readVoiceDevicePreferences,
  writeVoiceDevicePreference,
  type VoiceDevicePreferences,
} from "../voice-device-preferences";
import { useState } from "react";

export interface VoiceSettingsSectionProps {
  readonly autoJoin: boolean;
  readonly joinMuted: boolean;
  readonly pushToTalk: boolean;
  onChange(patch: {
    voiceAutoJoin?: boolean;
    voiceJoinMuted?: boolean;
    voicePushToTalk?: boolean;
  }): void;
}

export function VoiceSettingsSection({
  autoJoin,
  joinMuted,
  pushToTalk,
  onChange,
}: VoiceSettingsSectionProps) {
  const { t } = useTranslation();
  const devices = useVoiceDevices(true);
  const [local, setLocal] = useState<VoiceDevicePreferences>(() => readVoiceDevicePreferences());

  function selectDevice(kind: "input" | "output", deviceId: string) {
    const next = writeVoiceDevicePreference(kind, deviceId || null);
    setLocal(next);
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title={t("settings.voice.title")}
        description={t("settings.voice.description")}
      />
      <Surface padding="lg" className="space-y-4">
        <DeviceSelect
          label={t("settings.voice.input_device")}
          value={local.inputDeviceId ?? ""}
          options={devices.inputs}
          disabled={!devices.isSupported}
          fallbackLabel={t("settings.voice.device_default")}
          anonymousLabel={t("settings.voice.device_unnamed")}
          onChange={(value) => selectDevice("input", value)}
        />
        <DeviceSelect
          label={t("settings.voice.output_device")}
          value={local.outputDeviceId ?? ""}
          options={devices.outputs}
          disabled={!devices.isSupported}
          fallbackLabel={t("settings.voice.device_default")}
          anonymousLabel={t("settings.voice.device_unnamed")}
          onChange={(value) => selectDevice("output", value)}
        />
        {devices.isAnonymous ? (
          <p className="text-xs text-muted-foreground">{t("settings.voice.permission_hint")}</p>
        ) : null}

        <div className="space-y-1 border-t border-border pt-3">
          <VoiceToggle
            label={t("settings.voice.auto_join")}
            checked={autoJoin}
            onChange={(value) => onChange({ voiceAutoJoin: value })}
          />
          <VoiceToggle
            label={t("settings.voice.join_muted")}
            checked={joinMuted}
            onChange={(value) => onChange({ voiceJoinMuted: value })}
          />
          <VoiceToggle
            label={t("settings.voice.voice_activity")}
            description={t("settings.voice.voice_activity_hint")}
            checked={!pushToTalk}
            onChange={(value) => onChange({ voicePushToTalk: !value })}
          />
          <VoiceToggle
            label={t("settings.voice.push_to_talk")}
            description={t("settings.voice.coming_soon")}
            checked={false}
            disabled
            onChange={() => undefined}
          />
          <VoiceToggle
            label={t("settings.voice.noise_suppression")}
            description={t("settings.voice.coming_soon")}
            checked
            disabled
            onChange={() => undefined}
          />
          <VoiceToggle
            label={t("settings.voice.echo_cancellation")}
            description={t("settings.voice.coming_soon")}
            checked
            disabled
            onChange={() => undefined}
          />
        </div>
      </Surface>
    </section>
  );
}

function DeviceSelect({
  label,
  value,
  options,
  disabled,
  fallbackLabel,
  anonymousLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { deviceId: string; label: string }[];
  disabled: boolean;
  fallbackLabel: string;
  anonymousLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm disabled:opacity-60"
      >
        <option value="">{fallbackLabel}</option>
        {options.map((option) => (
          <option key={option.deviceId} value={option.deviceId}>
            {option.label || anonymousLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function VoiceToggle({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl px-2 text-left text-sm transition-colors hover:bg-accent/60 disabled:opacity-55 disabled:hover:bg-transparent"
    >
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
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
