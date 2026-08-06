/**
 * YouTube IFrame player hook — Sprint H1.
 *
 * The only place StreamFlow talks to a player. It owns the embed's lifecycle
 * and exposes the four verbs the sync loop needs: play, pause, seek, read.
 * Nothing here decides *when* to use them — that is the Domain's job.
 *
 * Legitimacy note: this uses YouTube's published embed player on the viewer's
 * own device. No stream is proxied, no protection is touched (ADR-014).
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { logger } from "@/foundation/logging";

const MODULE = "theater-youtube";
const API_SRC = "https://www.youtube.com/iframe_api";

type PlayerEventName = "playing" | "paused" | "ended" | "buffering" | "ready" | "error";

interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
  destroy(): void;
}

interface YouTubeApi {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeApi> | null = null;

function loadApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("youtube-api-missing"));
    };
    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = API_SRC;
      script.async = true;
      script.onerror = () => reject(new Error("youtube-api-blocked"));
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}

export interface YouTubePlayerHandle {
  /** Attach point for the embed. */
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly isReady: boolean;
  readonly hasFailed: boolean;
  /** Last phase the embed reported, for the HUD. */
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

export interface UseYouTubePlayerInput {
  readonly videoId: string | null;
  /** Fired for every state change the embed reports, local or remote. */
  onPhase?(phase: PlayerEventName, positionMs: number): void;
}

export function useYouTubePlayer({ videoId, onPhase }: UseYouTubePlayerInput): YouTubePlayerHandle {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const phaseHandler = useRef(onPhase);
  phaseHandler.current = onPhase;

  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [phase, setPhase] = useState<PlayerEventName | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!videoId || !containerRef.current) return;

    setIsReady(false);
    setHasFailed(false);

    const report = (next: PlayerEventName) => {
      if (cancelled) return;
      setPhase(next);
      const seconds = playerRef.current?.getCurrentTime() ?? 0;
      phaseHandler.current?.(next, Math.round(seconds * 1000));
    };

    void loadApi()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        const host = document.createElement("div");
        containerRef.current.replaceChildren(host);

        playerRef.current = new api.Player(host, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              setIsReady(true);
              report("ready");
            },
            onStateChange: (event: { data: number }) => {
              const map: Record<number, PlayerEventName> = {
                0: "ended",
                1: "playing",
                2: "paused",
                3: "buffering",
              };
              const next = map[event.data];
              if (next) report(next);
            },
            onError: () => {
              if (cancelled) return;
              setHasFailed(true);
              report("error");
            },
          },
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        logger.warn("player_unavailable", { module: MODULE, error: String(error) });
        setHasFailed(true);
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // A destroyed iframe is already the outcome we wanted.
      }
      playerRef.current = null;
    };
  }, [videoId]);

  const play = useCallback(() => playerRef.current?.playVideo(), []);
  const pause = useCallback(() => playerRef.current?.pauseVideo(), []);
  const seekTo = useCallback(
    (positionMs: number) => playerRef.current?.seekTo(Math.max(0, positionMs) / 1000, true),
    [],
  );
  const setRate = useCallback((rate: number) => {
    try {
      playerRef.current?.setPlaybackRate(rate);
    } catch {
      // Rate nudging is an optimization; never a failure path.
    }
  }, []);
  const setVolume = useCallback((volume: number) => {
    try {
      playerRef.current?.setVolume(Math.max(0, Math.min(100, Math.round(volume))));
    } catch {
      // Volume is a local comfort control; a refusal is never a failure path.
    }
  }, []);
  const positionMs = useCallback(() => {
    const seconds = playerRef.current?.getCurrentTime();
    return typeof seconds === "number" ? Math.round(seconds * 1000) : null;
  }, []);
  const durationMs = useCallback(() => {
    const seconds = playerRef.current?.getDuration();
    return typeof seconds === "number" && seconds > 0 ? Math.round(seconds * 1000) : null;
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
