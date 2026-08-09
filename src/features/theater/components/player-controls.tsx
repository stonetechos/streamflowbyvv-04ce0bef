/**
 * Player controls — Sprint H12.
 *
 * One control bar, rendered twice: over the theatre box and inside the
 * document Picture-in-Picture window. Both instances drive the same media
 * element, so the PiP controls are real controls, not a picture of controls.
 *
 * Every control is a real button with an accessible name, a visible focus
 * ring, and a 44px touch target. Nothing here depends on hover.
 */
import {
  Captions,
  Gauge,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import type { CaptionTrack, DirectPlayerState } from "../use-direct-player";
import type { PipSupport } from "../use-picture-in-picture";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export interface PlayerControlsProps {
  readonly state: DirectPlayerState;
  readonly captionTracks: readonly CaptionTrack[];
  /** False for a guest in a host-led room: transport is disabled, not hidden. */
  readonly canControlTransport: boolean;
  readonly transportNote?: string | null | undefined;
  readonly isFullscreen: boolean;
  readonly canFullscreen: boolean;
  readonly pipSupport: PipSupport;
  readonly isPipActive: boolean;
  /** Compact form is used inside the PiP window. */
  readonly variant?: "stage" | "pip" | undefined;
  onTogglePlay(): void;
  onSeekTo(positionMs: number): void;
  onSeekBy(deltaMs: number): void;
  onRestart(): void;
  onVolume(volume: number): void;
  onToggleMute(): void;
  onRate(rate: number): void;
  onCaptions(trackId: string | null): void;
  onToggleFullscreen(): void;
  onTogglePip(): void;
  onClose?: (() => void) | undefined;
}

function clock(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "--:--";
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

const ICON_BUTTON =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-white " +
  "transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60 " +
  "disabled:opacity-45 disabled:pointer-events-none";

export function PlayerControls({
  state,
  captionTracks,
  canControlTransport,
  transportNote = null,
  isFullscreen,
  canFullscreen,
  pipSupport,
  isPipActive,
  variant = "stage",
  onTogglePlay,
  onSeekTo,
  onSeekBy,
  onRestart,
  onVolume,
  onToggleMute,
  onRate,
  onCaptions,
  onToggleFullscreen,
  onTogglePip,
  onClose,
}: PlayerControlsProps) {
  const { t } = useTranslation();
  const duration = state.durationMs ?? 0;
  const compact = variant === "pip";
  const pipUnsupported = pipSupport === "none";

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 bg-gradient-to-t from-black/85 via-black/60 to-transparent",
        compact ? "px-2 pb-2 pt-3" : "px-3 pb-3 pt-8 sm:px-4 sm:pb-4",
      )}
      data-sf-player-controls={variant}
    >
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-right text-xs tabular-nums text-white/85">
          {clock(state.positionMs)}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={250}
          value={Math.min(state.positionMs, Math.max(duration, 1))}
          disabled={!canControlTransport || duration === 0}
          aria-label={t("theater.player.seek")}
          aria-valuetext={`${clock(state.positionMs)} / ${clock(state.durationMs)}`}
          onChange={(event) => onSeekTo(Number(event.target.value))}
          data-sf-player-scrubber
          className="h-11 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60 disabled:cursor-not-allowed"
        />
        <span className="w-14 shrink-0 text-xs tabular-nums text-white/85">
          {clock(state.durationMs)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          className={ICON_BUTTON}
          onClick={onTogglePlay}
          disabled={!canControlTransport}
          aria-label={state.isPaused ? t("theater.transport.play") : t("theater.transport.pause")}
          data-sf-player-action={state.isPaused ? "play" : "pause"}
        >
          {state.isPaused ? <Play className="size-5" /> : <Pause className="size-5" />}
        </button>

        <button
          type="button"
          className={ICON_BUTTON}
          onClick={() => onSeekBy(-10_000)}
          disabled={!canControlTransport}
          aria-label={t("theater.transport.back")}
          data-sf-player-action="back"
        >
          <span aria-hidden="true" className="text-xs font-semibold">
            −10
          </span>
        </button>
        <button
          type="button"
          className={ICON_BUTTON}
          onClick={() => onSeekBy(10_000)}
          disabled={!canControlTransport}
          aria-label={t("theater.transport.forward")}
          data-sf-player-action="forward"
        >
          <span aria-hidden="true" className="text-xs font-semibold">
            +10
          </span>
        </button>
        {compact ? null : (
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={onRestart}
            disabled={!canControlTransport}
            aria-label={t("theater.transport.restart")}
            data-sf-player-action="restart"
          >
            <RotateCcw className="size-5" />
          </button>
        )}

        <button
          type="button"
          className={ICON_BUTTON}
          onClick={onToggleMute}
          aria-label={state.isMuted ? t("theater.player.unmute") : t("theater.player.mute")}
          aria-pressed={state.isMuted}
          data-sf-player-action="mute"
        >
          {state.isMuted || state.volume === 0 ? (
            <VolumeX className="size-5" />
          ) : (
            <Volume2 className="size-5" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={state.isMuted ? 0 : state.volume}
          aria-label={t("theater.player.volume")}
          onChange={(event) => onVolume(Number(event.target.value))}
          data-sf-player-volume
          className={cn(
            "h-11 cursor-pointer appearance-none bg-transparent accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60",
            compact ? "w-16" : "w-20 sm:w-24",
          )}
        />

        <span className="flex-1" />

        {captionTracks.length > 0 ? (
          <label className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-white">
            <Captions aria-hidden="true" className="size-5" />
            <span className="sr-only">{t("theater.player.captions")}</span>
            <select
              value={state.captionsTrackId ?? ""}
              onChange={(event) => onCaptions(event.target.value || null)}
              aria-label={t("theater.player.captions")}
              data-sf-player-captions
              className="min-h-11 rounded-lg bg-black/50 px-1 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <option value="">{t("theater.player.captions_off")}</option>
              {captionTracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-white">
          <Gauge aria-hidden="true" className="size-5" />
          <span className="sr-only">{t("theater.player.speed")}</span>
          <select
            value={state.rate}
            onChange={(event) => onRate(Number(event.target.value))}
            aria-label={t("theater.player.speed")}
            data-sf-player-rate
            className="min-h-11 rounded-lg bg-black/50 px-1 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={ICON_BUTTON}
          onClick={onTogglePip}
          disabled={pipUnsupported}
          aria-pressed={isPipActive}
          aria-label={
            pipUnsupported
              ? t("theater.player.pip_unsupported")
              : isPipActive
                ? t("theater.player.pip_exit")
                : t("theater.player.pip")
          }
          title={pipUnsupported ? t("theater.player.pip_unsupported") : undefined}
          data-sf-player-action="pip"
          data-sf-pip-support={pipSupport}
        >
          <PictureInPicture2 className="size-5" />
        </button>

        {canFullscreen && !compact ? (
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={onToggleFullscreen}
            aria-pressed={isFullscreen}
            aria-label={
              isFullscreen ? t("theater.player.exit_fullscreen") : t("theater.player.fullscreen")
            }
            data-sf-player-action="fullscreen"
          >
            {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
        ) : null}

        {onClose && !compact ? (
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={onClose}
            aria-label={t("theater.player.close")}
            data-sf-player-action="close"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      {pipUnsupported ? (
        <p className="text-[11px] text-white/70" data-sf-pip-note>
          {t("theater.player.pip_unsupported")}
        </p>
      ) : null}
      {transportNote ? (
        <p className="text-[11px] text-white/70" data-sf-transport-note>
          {transportNote}
        </p>
      ) : null}
    </div>
  );
}
