/**
 * Direct video player hook — Sprint H3.
 *
 * The only player StreamFlow drives. It plays a directly reachable video file
 * the host pasted, on the viewer's own device, through the browser's own
 * `<video>` element. It exposes the four verbs the sync loop needs: play,
 * pause, seek, read. Nothing here decides *when* to use them.
 *
 * No premium service is embedded, driven, or proxied (ADR-014).
 */
import { useCallback, useEffect, useRef, useState } from "react";

type PlayerEventName = "playing" | "paused" | "ended" | "buffering" | "ready" | "error";

export interface DirectPlayerHandle {
  /** Attach point for the media element. */
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly isReady: boolean;
  readonly hasFailed: boolean;
  /** Last phase the element reported, for the HUD. */
  readonly phase: PlayerEventName | null;
  play(): void;
  pause(): void;
  seekTo(positionMs: number): void;
  setRate(rate: number): void;
  /** Per-device only. Volume is never shared with the room. */
  setVolume(volume: number): void;
  positionMs(): number | null;
  durationMs(): number | null;
}

export interface UseDirectPlayerInput {
  readonly url: string | null;
  onPhase?(phase: PlayerEventName, positionMs: number): void;
}

export function useDirectPlayer({ url, onPhase }: UseDirectPlayerInput): DirectPlayerHandle {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef<HTMLVideoElement | null>(null);
  const phaseHandler = useRef(onPhase);
  phaseHandler.current = onPhase;

  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [phase, setPhase] = useState<PlayerEventName | null>(null);

  useEffect(() => {
    const host = containerRef.current;
    if (!url || !host) return;

    setIsReady(false);
    setHasFailed(false);

    const video = document.createElement("video");
    video.src = url;
    video.playsInline = true;
    video.preload = "auto";
    video.className = "h-full w-full bg-black";
    host.replaceChildren(video);
    elementRef.current = video;

    const report = (next: PlayerEventName) => {
      setPhase(next);
      phaseHandler.current?.(next, Math.round((video.currentTime || 0) * 1000));
    };

    const onLoaded = () => {
      setIsReady(true);
      report("ready");
    };
    const onPlaying = () => report("playing");
    const onPause = () => report("paused");
    const onEnded = () => report("ended");
    const onWaiting = () => report("buffering");
    const onError = () => {
      setHasFailed(true);
      report("error");
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("error", onError);
      video.pause();
      video.removeAttribute("src");
      video.load();
      host.replaceChildren();
      elementRef.current = null;
    };
  }, [url]);

  const play = useCallback(() => {
    void elementRef.current?.play().catch(() => undefined);
  }, []);
  const pause = useCallback(() => elementRef.current?.pause(), []);
  const seekTo = useCallback((positionMs: number) => {
    const video = elementRef.current;
    if (video) video.currentTime = Math.max(0, positionMs) / 1000;
  }, []);
  const setRate = useCallback((rate: number) => {
    const video = elementRef.current;
    if (video) video.playbackRate = rate;
  }, []);
  const setVolume = useCallback((volume: number) => {
    const video = elementRef.current;
    if (video) video.volume = Math.max(0, Math.min(100, volume)) / 100;
  }, []);
  const positionMs = useCallback(() => {
    const video = elementRef.current;
    return video ? Math.round(video.currentTime * 1000) : null;
  }, []);
  const durationMs = useCallback(() => {
    const seconds = elementRef.current?.duration;
    return typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0
      ? Math.round(seconds * 1000)
      : null;
  }, []);

  return {
    containerRef,
    isReady,
    hasFailed,
    phase,
    play,
    pause,
    seekTo,
    setRate,
    setVolume,
    positionMs,
    durationMs,
  };
}
