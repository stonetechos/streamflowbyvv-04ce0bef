/**
 * Media card — Sprint H2.
 *
 * The room's shared answer to "what are we watching, and what happens when
 * the countdown ends?". Everything it prints comes from the capability model
 * and the room's own state, so the card can only ever describe what the
 * provider genuinely permits.
 */
import { ActionButton, Surface } from "@/design-system/components";
import type { MediaRefValidity, RoomPhase, WatchProviderCapability, WatchSource } from "@/domain";
import { useTranslation } from "@/foundation/localization";

import { providerModeKey } from "./provider-bar";

export interface MediaCardProps {
  readonly source: WatchSource | null;
  readonly label: string | null;
  readonly capability: WatchProviderCapability;
  readonly isHost: boolean;
  readonly participantCount: number;
  /** Seconds left in a running countdown, or null when none is running. */
  readonly countdownSeconds: number | null;
  /** Shared lifecycle phase, derived from the same snapshot for everyone. */
  readonly phase: RoomPhase;
  /** How trustworthy the room's selection is, straight from RoomMediaRef. */
  readonly validity: MediaRefValidity | null;
  readonly canStart: boolean;
  readonly isStarting: boolean;
  onStart(): void;
  onCancel(): void;
  /** Only offered when the active surface can actually go fullscreen. */
  readonly onFullscreen: (() => void) | null;
  /** Local-only. Never shared with the room. */
  readonly volume: number;
  onVolumeChange(next: number): void;
  readonly showVolume: boolean;
}

export function MediaCard({
  source,
  label,
  capability,
  isHost,
  participantCount,
  countdownSeconds,
  phase,
  validity,
  canStart,
  isStarting,
  onStart,
  onCancel,
  onFullscreen,
  volume,
  onVolumeChange,
  showVolume,
}: MediaCardProps) {
  const { t } = useTranslation();
  const isCounting = countdownSeconds !== null;
  // The host's one button says exactly which of the three situations it is in.
  const startState: "ready" | "invalid" | "empty" =
    validity === "invalid" ? "invalid" : source && canStart ? "ready" : "empty";

  return (
    <Surface
      tone="card"
      padding="md"
      className="flex flex-col gap-4"
      data-sf-media-card={source ? capability.providerId : "none"}
      data-sf-sync-mode={capability.playbackControlMode}
      data-sf-room-phase={phase}
      data-sf-media-validity={validity ?? "none"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold" data-sf-media-title>
            {label ?? t("theater.media.none")}
          </p>
          <p className="text-xs text-muted-foreground">
            {source
              ? t("theater.media.meta", {
                  provider: capability.displayName,
                  mode: t(providerModeKey(capability.playbackControlMode)),
                })
              : isHost
                ? t("theater.media.none_hint")
                : t("theater.media.guest_waiting")}
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {t("theater.header.people", { count: participantCount })}
        </span>
      </div>

      {isCounting ? (
        <p
          className="text-3xl font-semibold tabular-nums"
          data-sf-countdown-seconds={countdownSeconds}
        >
          {countdownSeconds}
        </p>
      ) : null}

      {validity === "invalid" ? (
        <p className="text-xs text-destructive" data-sf-media-migration>
          {t("theater.media.migration")}
        </p>
      ) : null}

      <ul className="space-y-1 text-xs text-muted-foreground">
        {capability.limitations.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        {isHost ? (
          isCounting ? (
            <ActionButton tone="secondary" size="sm" onClick={onCancel}>
              {t("theater.party.cancel")}
            </ActionButton>
          ) : (
            <ActionButton
              size="sm"
              onClick={onStart}
              loading={isStarting}
              disabled={!canStart}
              data-sf-start-state={startState}
            >
              {t(
                startState === "ready"
                  ? "theater.party.start"
                  : startState === "invalid"
                    ? "theater.party.fix"
                    : "theater.party.select",
              )}
            </ActionButton>
          )
        ) : null}

        {onFullscreen ? (
          <ActionButton tone="ghost" size="sm" onClick={onFullscreen} data-sf-fullscreen="embedded">
            {t("theater.fullscreen.embedded")}
          </ActionButton>
        ) : source ? (
          <span className="text-xs text-muted-foreground" data-sf-fullscreen="provider-native">
            {t("theater.fullscreen.provider_native", { provider: capability.displayName })}
          </span>
        ) : null}
      </div>

      {showVolume ? (
        <label className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{t("theater.volume.label")}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            data-sf-volume-scope="device"
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            className="h-1 w-40 accent-primary"
          />
          <span className="tabular-nums">{volume}</span>
        </label>
      ) : null}
    </Surface>
  );
}
