/**
 * Direct video player hook — Sprint H3, extended in H12 for the theatre box.
 *
 * The only player StreamFlow drives. It plays a directly reachable video file
 * the host pasted, on the viewer's own device, through the browser's own
 * `<video>` element. It exposes the verbs the sync loop and the in-app theatre
 * controls need: play, pause, seek, rate, volume, mute, captions, read.
 *
 * The media element lives inside a detached host `<div>` owned by this hook,
 * never inside a React-rendered node. That is what makes Picture-in-Picture
 * honest: the same single element is *moved* between the theatre box and the
 * PiP window, so there is exactly one playback instance and nothing to keep in
 * sync by hand.
 *
 * No premium service is embedded, driven, or proxied (ADR-014).
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { captionTrackId, toCaptionTracks } from "./caption-tracks";
import type { CaptionTrack } from "./caption-track-types";

type PlayerEventName = "playing" | "paused" | "ended" | "buffering" | "ready" | "error";

export type { CaptionTrack } from "./caption-track-types";

/** A sidecar subtitle file the source publishes alongside the video. */
export interface TextTrackSource {
  readonly src: string;
  readonly srclang: string;
  readonly label: string;
  readonly kind?: "subtitles" | "captions";
  readonly default?: boolean;
}

export interface DirectPlayerState {
  readonly positionMs: number;
  readonly durationMs: number | null;
  readonly bufferedMs: number;
  readonly isPaused: boolean;
  readonly isEnded: boolean;
  readonly isBuffering: boolean;
  readonly isMuted: boolean;
  /** 0–100, per device. Never shared with the room. */
  readonly volume: number;
  readonly rate: number;
  readonly captionsTrackId: string | null;
}

export interface DirectPlayerHandle {
  /** Attach point for the media element (legacy prop shape). */
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly isReady: boolean;
  readonly hasFailed: boolean;
  /** Last phase the element reported, for the HUD. */
  readonly phase: PlayerEventName | null;
  readonly state: DirectPlayerState;
  readonly captionTracks: readonly CaptionTrack[];
  /** Moves the single media element into `slot`. Null detaches nothing. */
  mountTo(slot: HTMLElement | null): void;
  element(): HTMLVideoElement | null;
  play(): void;
  pause(): void;
  seekTo(positionMs: number): void;
  setRate(rate: number): void;
  /** Per-device only. Volume is never shared with the room. */
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  /** Passing null turns captions off. */
  setCaptionsTrack(trackId: string | null): void;
  positionMs(): number | null;
  durationMs(): number | null;
}

export interface UseDirectPlayerInput {
  readonly url: string | null;
  /** Sidecar WebVTT files the source publishes. Empty means no captions exist. */
  readonly textTracks?: readonly TextTrackSource[];
  onPhase?(phase: PlayerEventName, positionMs: number): void;
}

const INITIAL_STATE: DirectPlayerState = {
  positionMs: 0,
  durationMs: null,
  bufferedMs: 0,
  isPaused: true,
  isEnded: false,
  isBuffering: false,
  isMuted: false,
  volume: 80,
  rate: 1,
  captionsTrackId: null,
};

const NO_TEXT_TRACKS: readonly TextTrackSource[] = [];

export function useDirectPlayer({
  url,
  textTracks = NO_TEXT_TRACKS,
  onPhase,
}: UseDirectPlayerInput): DirectPlayerHandle {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef<HTMLVideoElement | null>(null);
  const phaseHandler = useRef(onPhase);
  phaseHandler.current = onPhase;

  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [phase, setPhase] = useState<PlayerEventName | null>(null);
  const [state, setState] = useState<DirectPlayerState>(INITIAL_STATE);
  const [captionTracks, setCaptionTracks] = useState<readonly CaptionTrack[]>([]);

  if (!hostRef.current && typeof document !== "undefined") {
    const host = document.createElement("div");
    host.setAttribute("data-sf-player-host", "");
    host.style.position = "absolute";
    host.style.inset = "0";
    hostRef.current = host;
  }

  const mountTo = useCallback((slot: HTMLElement | null) => {
    const host = hostRef.current;
    if (!slot || !host || host.parentElement === slot) return;
    slot.appendChild(host);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!url || !host) return;

    setIsReady(false);
    setHasFailed(false);
    setState(INITIAL_STATE);
    setCaptionTracks([]);

    const video = document.createElement("video");
    video.src = url;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.setAttribute("data-sf-player", "video");
    video.className = "h-full w-full bg-black object-contain";
    for (const source of textTracks) {
      const track = document.createElement("track");
      track.kind = source.kind ?? "subtitles";
      track.src = source.src;
      track.srclang = source.srclang;
      track.label = source.label;
      video.appendChild(track);
    }
    host.replaceChildren(video);
    elementRef.current = video;

    const readTracks = () => {
      setCaptionTracks(toCaptionTracks(Array.from(video.textTracks ?? [])));
    };
    video.textTracks?.addEventListener?.("addtrack", readTracks);
    video.textTracks?.addEventListener?.("removetrack", readTracks);
    readTracks();

    const sync = () => {
      const buffered =
        video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) * 1000 : 0;
      const all = Array.from(video.textTracks ?? []);
      const activeIndex = all.findIndex((track) => track.mode === "showing");
      const active = activeIndex >= 0 ? all[activeIndex] : undefined;
      setState((current) => ({
        ...current,
        positionMs: Math.round((video.currentTime || 0) * 1000),
        durationMs:
          Number.isFinite(video.duration) && video.duration > 0
            ? Math.round(video.duration * 1000)
            : null,
        bufferedMs: Math.round(buffered),
        isPaused: video.paused,
        isEnded: video.ended,
        isMuted: video.muted,
        volume: Math.round(video.volume * 100),
        rate: video.playbackRate,
        captionsTrackId: active ? captionTrackId(active, activeIndex) : null,
      }));
    };

    const report = (next: PlayerEventName) => {
      setPhase(next);
      setState((current) => ({ ...current, isBuffering: next === "buffering" }));
      sync();
      phaseHandler.current?.(next, Math.round((video.currentTime || 0) * 1000));
    };

    const onLoaded = () => {
      setIsReady(true);
      readTracks();
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
    video.addEventListener("timeupdate", sync);
    video.addEventListener("progress", sync);
    video.addEventListener("volumechange", sync);
    video.addEventListener("ratechange", sync);
    video.addEventListener("seeked", sync);
    video.addEventListener("durationchange", sync);

    return () => {
      video.textTracks?.removeEventListener?.("addtrack", readTracks);
      video.textTracks?.removeEventListener?.("removetrack", readTracks);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("error", onError);
      video.removeEventListener("timeupdate", sync);
      video.removeEventListener("progress", sync);
      video.removeEventListener("volumechange", sync);
      video.removeEventListener("ratechange", sync);
      video.removeEventListener("seeked", sync);
      video.removeEventListener("durationchange", sync);
      video.pause();
      video.removeAttribute("src");
      video.load();
      host.replaceChildren();
      elementRef.current = null;
    };
    // The track list is part of the source: a different list is a different element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    url,
    textTracks
      .map((track) => `${track.kind ?? "subtitles"}:${track.srclang}:${track.src}`)
      .join("|"),
  ]);

  // Legacy attach point: when a plain container is supplied, host lands in it.
  useEffect(() => {
    if (containerRef.current) mountTo(containerRef.current);
  });

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
    if (!video) return;
    video.volume = Math.max(0, Math.min(100, volume)) / 100;
    if (volume > 0 && video.muted) video.muted = false;
  }, []);
  const setMuted = useCallback((muted: boolean) => {
    const video = elementRef.current;
    if (video) video.muted = muted;
  }, []);
  const setCaptionsTrack = useCallback((trackId: string | null) => {
    const video = elementRef.current;
    if (!video) return;
    Array.from(video.textTracks ?? []).forEach((track, index) => {
      const id = captionTrackId(track, index);
      track.mode = trackId !== null && id === trackId ? "showing" : "disabled";
    });
    setState((current) => ({ ...current, captionsTrackId: trackId }));
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
    state,
    captionTracks,
    mountTo,
    element: () => elementRef.current,
    play,
    pause,
    seekTo,
    setRate,
    setVolume,
    setMuted,
    setCaptionsTrack,
    positionMs,
    durationMs,
  };
}
