/**
 * Theatre box — Sprint H12.
 *
 * The canonical playback container. Launch, resume, verification, fullscreen
 * and Picture-in-Picture all happen here; nothing sends a person to another
 * page or tab for ordinary playback. Only sources StreamFlow is permitted to
 * play reach this component (ADR-014) — a launch-only service still gets the
 * honest handoff stage.
 *
 * There is exactly one media element. Fullscreen re-parents nothing, and PiP
 * moves that same element into the floating window, so playback never restarts
 * and there is no second instance to drift.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ActionButton } from "@/design-system/components";
import { useTranslation } from "@/foundation/localization";
import { cn } from "@/lib/utils";

import type { DirectPlayerHandle } from "../use-direct-player";
import { usePictureInPicture } from "../use-picture-in-picture";
import { PlayerControls } from "./player-controls";

/** How long the controls stay up after the last interaction, while playing. */
const IDLE_HIDE_MS = 2_800;

export interface TheaterBoxProps {
  readonly player: DirectPlayerHandle;
  readonly title?: string | null;
  /** A guest in a host-led room may watch and adjust their own device only. */
  readonly canControlTransport: boolean;
  readonly transportNote?: string | null;
  readonly canFullscreen?: boolean;
  /** Room-level playback intent. Local-only settings bypass these. */
  onTogglePlay(): void;
  onSeekTo(positionMs: number): void;
  onSeekBy(deltaMs: number): void;
  onRestart(): void;
  /** Back-to-context: closes the theatre box without ending the room. */
  onClose?(): void;
  onRetry?(): void;
}

export function TheaterBox({
  player,
  title = null,
  canControlTransport,
  transportNote = null,
  canFullscreen = true,
  onTogglePlay,
  onSeekTo,
  onSeekBy,
  onRestart,
  onClose,
  onRetry,
}: TheaterBoxProps) {
  const { t } = useTranslation();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const stageSlotRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<number | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const pip = usePictureInPicture({
    getVideo: () => player.element(),
    onExit: (mode) => {
      // The element comes home to the same position, playing or paused.
      player.mountTo(stageSlotRef.current);
      if (mode === "document") boxRef.current?.focus();
    },
  });

  // The element lives in the stage unless a document PiP window owns it.
  useEffect(() => {
    if (pip.mode !== "document") player.mountTo(stageSlotRef.current);
  }, [pip.mode, player]);

  const wake = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      const box = boxRef.current;
      const holdsFocus = box?.contains(box.ownerDocument.activeElement);
      if (!holdsFocus) setControlsVisible(false);
    }, IDLE_HIDE_MS);
  }, []);

  // Controls only auto-hide while something is actually playing.
  useEffect(() => {
    if (player.state.isPaused || player.state.isEnded) {
      setControlsVisible(true);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      return;
    }
    wake();
    return () => {
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, [player.state.isPaused, player.state.isEnded, wake]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === boxRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    if (document.fullscreenElement === box) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    void box.requestFullscreen?.().catch(() => undefined);
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      // Range inputs and selects own their own arrow keys.
      if (target.tagName === "INPUT" || target.tagName === "SELECT") {
        wake();
        return;
      }
      const keys: Record<string, () => void> = {
        " ": () => canControlTransport && onTogglePlay(),
        k: () => canControlTransport && onTogglePlay(),
        ArrowLeft: () => canControlTransport && onSeekBy(-5_000),
        ArrowRight: () => canControlTransport && onSeekBy(5_000),
        j: () => canControlTransport && onSeekBy(-10_000),
        l: () => canControlTransport && onSeekBy(10_000),
        ArrowUp: () => player.setVolume(Math.min(100, player.state.volume + 5)),
        ArrowDown: () => player.setVolume(Math.max(0, player.state.volume - 5)),
        m: () => player.setMuted(!player.state.isMuted),
        f: () => canFullscreen && toggleFullscreen(),
        i: () => pip.toggle(),
      };
      const action = keys[event.key];
      if (!action) return;
      event.preventDefault();
      wake();
      action();
    },
    [
      canControlTransport,
      canFullscreen,
      onSeekBy,
      onTogglePlay,
      pip,
      player,
      toggleFullscreen,
      wake,
    ],
  );

  const controls = (variant: "stage" | "pip") => (
    <PlayerControls
      variant={variant}
      state={player.state}
      captionTracks={player.captionTracks}
      canControlTransport={canControlTransport}
      transportNote={transportNote}
      isFullscreen={isFullscreen}
      canFullscreen={canFullscreen}
      pipSupport={pip.support}
      isPipActive={pip.isActive}
      onTogglePlay={onTogglePlay}
      onSeekTo={onSeekTo}
      onSeekBy={onSeekBy}
      onRestart={onRestart}
      onVolume={(value) => player.setVolume(value)}
      onToggleMute={() => player.setMuted(!player.state.isMuted)}
      onRate={(rate) => player.setRate(rate)}
      onCaptions={(trackId) => player.setCaptionsTrack(trackId)}
      onToggleFullscreen={toggleFullscreen}
      onTogglePip={pip.toggle}
      onClose={onClose}
    />
  );

  const inPipWindow = pip.mode === "document";

  return (
    <div
      ref={boxRef}
      tabIndex={0}
      role="region"
      aria-label={t("theater.player.region", { title: title ?? t("theater.player.untitled") })}
      onKeyDown={onKeyDown}
      onPointerMove={wake}
      onPointerDown={wake}
      onFocus={wake}
      data-sf-stage="embedded"
      data-sf-theater-box
      data-sf-pip-mode={pip.mode ?? "off"}
      data-sf-controls-visible={controlsVisible ? "true" : "false"}
      className={cn(
        "sf-stage-enter group relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-e2 ring-1 ring-border/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isFullscreen && "aspect-auto h-full rounded-none",
      )}
    >
      {/* The single media element mounts here. */}
      <div ref={stageSlotRef} className="absolute inset-0" data-sf-player-slot="stage" />

      {inPipWindow ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 p-6 text-center"
          data-sf-pip-placeholder
        >
          <p className="text-sm font-medium">{t("theater.player.pip_active")}</p>
          <ActionButton size="sm" tone="secondary" onClick={() => void pip.exit()}>
            {t("theater.player.pip_exit")}
          </ActionButton>
        </div>
      ) : null}

      {!inPipWindow && player.hasFailed ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 p-6 text-center"
          role="alert"
          data-sf-player-error
        >
          <p className="max-w-sm text-sm text-muted-foreground">{t("theater.player.error")}</p>
          {onRetry ? (
            <ActionButton size="sm" tone="secondary" onClick={onRetry}>
              {t("common.action.retry")}
            </ActionButton>
          ) : null}
        </div>
      ) : null}

      {!inPipWindow && !player.hasFailed && !player.isReady ? (
        <div
          className="absolute inset-0 flex items-center justify-center"
          role="status"
          data-sf-player-loading
        >
          <p className="text-sm text-white/80">{t("common.state.loading")}</p>
        </div>
      ) : null}

      {!inPipWindow && player.isReady && player.state.isBuffering ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          role="status"
          data-sf-player-buffering
        >
          <span className="size-10 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />
        </div>
      ) : null}

      {!inPipWindow && player.state.isEnded ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center"
          data-sf-player-ended
        >
          <p className="text-sm text-white">{t("theater.player.ended")}</p>
          {canControlTransport ? (
            <ActionButton size="sm" tone="secondary" onClick={onRestart}>
              {t("theater.transport.restart")}
            </ActionButton>
          ) : null}
        </div>
      ) : null}

      {!inPipWindow ? (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 transition-opacity duration-200",
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          data-sf-controls-layer
        >
          {controls("stage")}
        </div>
      ) : null}

      {pip.pipWindow
        ? createPortal(
            <div className="flex h-dvh w-full flex-col bg-black">
              <div
                ref={(node) => {
                  if (node) player.mountTo(node);
                }}
                className="relative min-h-0 flex-1"
                data-sf-player-slot="pip"
              />
              {controls("pip")}
            </div>,
            pip.pipWindow.document.body,
          )
        : null}
    </div>
  );
}
