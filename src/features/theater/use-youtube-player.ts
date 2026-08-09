/**
 * YouTube player hook — Tier A.
 *
 * The second player StreamFlow genuinely drives. It uses YouTube's own public
 * IFrame Player API — the sanctioned, documented embed — on the viewer's own
 * device, with YouTube's ads, availability and account rules untouched. No
 * page is scraped, no private endpoint is called, and nothing is proxied.
 *
 * It deliberately exposes the same handle shape as the direct video player so
 * the sync loop, the theatre box and the transport controls do not know or
 * care which engine is behind the stage. Two capabilities honestly differ:
 * there is no HTMLVideoElement to hand to Picture-in-Picture, and captions are
 * owned by YouTube's own player, so both are reported as unavailable rather
 * than faked.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { CaptionTrack } from "./caption-track-types";
import type { DirectPlayerHandle, DirectPlayerState } from "./use-direct-player";

type PlayerEventName = "playing" | "paused" | "ended" | "buffering" | "ready" | "error";

const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";
/** How often the room reads the player's clock. Fast enough for drift bands. */
const POLL_MS = 250;

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

const NO_TRACKS: readonly CaptionTrack[] = [];

interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getVolume(): number;
  getPlaybackRate(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getVideoLoadedFraction(): number;
  destroy(): void;
}

interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => YouTubePlayer;
  PlayerState: Record<string, number>;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Loads the official IFrame API exactly once per document. */
function loadIframeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve, reject) => {
    const settle = () => {
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("youtube api unavailable"));
    };
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      settle();
    };
    if (document.querySelector(`script[src="${IFRAME_API_SRC}"]`)) return;
    const script = document.createElement("script");
    script.src = IFRAME_API_SRC;
    script.async = true;
    script.onerror = () => reject(new Error("youtube api blocked"));
    document.head.appendChild(script);
  });
}

export interface UseYouTubePlayerInput {
  /** Video id, or null when the room is not on a YouTube source. */
  readonly videoId: string | null;
  onPhase?(phase: PlayerEventName, positionMs: number): void;
}

export function useYouTubePlayer({ videoId, onPhase }: UseYouTubePlayerInput): DirectPlayerHandle {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const phaseHandler = useRef(onPhase);
  phaseHandler.current = onPhase;

  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [phase, setPhase] = useState<PlayerEventName | null>(null);
  const [state, setState] = useState<DirectPlayerState>(INITIAL_STATE);

  if (!hostRef.current && typeof document !== "undefined") {
    const host = document.createElement("div");
    host.setAttribute("data-sf-player-host", "youtube");
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
    if (!videoId || !host) return;

    let disposed = false;
    let poll = 0;
    setIsReady(false);
    setHasFailed(false);
    setState(INITIAL_STATE);

    const mount = document.createElement("div");
    mount.className = "h-full w-full";
    mount.setAttribute("data-sf-player", "youtube");
    host.replaceChildren(mount);

    const report = (next: PlayerEventName) => {
      setPhase(next);
      const seconds = playerRef.current?.getCurrentTime() ?? 0;
      phaseHandler.current?.(next, Math.round(seconds * 1000));
    };

    void loadIframeApi()
      .then((api) => {
        if (disposed) return;
        const player = new api.Player(mount, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            // StreamFlow owns the transport; YouTube's own chrome would let a
            // guest silently desync the room.
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (disposed) return;
              playerRef.current = player;
              setIsReady(true);
              report("ready");
            },
            onError: () => {
              if (disposed) return;
              setHasFailed(true);
              report("error");
            },
            onStateChange: (event: { data: number }) => {
              if (disposed) return;
              const states = api.PlayerState;
              if (event.data === states["PLAYING"]) report("playing");
              else if (event.data === states["PAUSED"]) report("paused");
              else if (event.data === states["ENDED"]) report("ended");
              else if (event.data === states["BUFFERING"]) report("buffering");
              setState((current) => ({
                ...current,
                isPaused: event.data !== states["PLAYING"],
                isEnded: event.data === states["ENDED"],
                isBuffering: event.data === states["BUFFERING"],
              }));
            },
          },
        });
        playerRef.current = player;

        poll = window.setInterval(() => {
          const active = playerRef.current;
          if (!active) return;
          const duration = active.getDuration();
          setState((current) => ({
            ...current,
            positionMs: Math.round((active.getCurrentTime() || 0) * 1000),
            durationMs: duration > 0 ? Math.round(duration * 1000) : null,
            bufferedMs:
              duration > 0 ? Math.round(active.getVideoLoadedFraction() * duration * 1000) : 0,
            isMuted: active.isMuted(),
            volume: Math.round(active.getVolume()),
            rate: active.getPlaybackRate(),
          }));
        }, POLL_MS);
      })
      .catch(() => {
        if (!disposed) setHasFailed(true);
      });

    return () => {
      disposed = true;
      if (poll) window.clearInterval(poll);
      try {
        playerRef.current?.destroy();
      } catch {
        // A player torn down with its iframe already gone is not an error.
      }
      playerRef.current = null;
      host.replaceChildren();
    };
  }, [videoId]);

  // Legacy attach point, same contract as the direct player.
  useEffect(() => {
    if (containerRef.current) mountTo(containerRef.current);
  });

  const play = useCallback(() => playerRef.current?.playVideo(), []);
  const pause = useCallback(() => playerRef.current?.pauseVideo(), []);
  const seekTo = useCallback((positionMs: number) => {
    playerRef.current?.seekTo(Math.max(0, positionMs) / 1000, true);
  }, []);
  const setRate = useCallback((rate: number) => playerRef.current?.setPlaybackRate(rate), []);
  const setVolume = useCallback((volume: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.setVolume(Math.max(0, Math.min(100, volume)));
    if (volume > 0 && player.isMuted()) player.unMute();
  }, []);
  const setMuted = useCallback((muted: boolean) => {
    const player = playerRef.current;
    if (!player) return;
    if (muted) player.mute();
    else player.unMute();
  }, []);

  return {
    containerRef,
    isReady,
    hasFailed,
    phase,
    state,
    captionTracks: NO_TRACKS,
    mountTo,
    // YouTube's player is an iframe: there is no media element to hand over,
    // so Picture-in-Picture honestly reports itself as unsupported.
    element: () => null,
    play,
    pause,
    seekTo,
    setRate,
    setVolume,
    setMuted,
    setCaptionsTrack: () => undefined,
    positionMs: () => {
      const player = playerRef.current;
      return player ? Math.round(player.getCurrentTime() * 1000) : null;
    },
    durationMs: () => {
      const seconds = playerRef.current?.getDuration();
      return typeof seconds === "number" && seconds > 0 ? Math.round(seconds * 1000) : null;
    },
  };
}
