/**
 * Watch source model — Sprint H1.
 *
 * What StreamFlow may legitimately place inside its own player, and what it
 * may not. A source is only ever "embeddable" when the platform publishes an
 * embed surface for it; everything else is honestly reported as coordination
 * only. No DRM is touched, no stream is proxied, no provider page is imitated
 * (Constitution §compliance, ADR-014).
 */

/** How playback can be driven for a source. */
export type PlaybackControlMode = "automatic" | "manual" | "unavailable";

export interface WatchSourceCapability {
  readonly providerId: string;
  readonly displayName: string;
  readonly supported: boolean;
  readonly playbackControlMode: PlaybackControlMode;
  readonly requiresUserSubscription: boolean;
  readonly requiresExtensionOrCompanion: boolean;
  readonly supportedPlatforms: readonly string[];
  readonly limitations: readonly string[];
}

export type WatchSource =
  | {
      readonly kind: "youtube";
      readonly providerId: "youtube";
      readonly videoId: string;
      readonly url: string;
      readonly label: string;
    }
  | {
      readonly kind: "external";
      readonly providerId: string;
      readonly url: string | null;
      readonly label: string;
    };

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function readYouTubeId(url: URL): string | null {
  if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
    const id = url.pathname.slice(1).split("/")[0] ?? "";
    return VIDEO_ID.test(id) ? id : null;
  }
  const param = url.searchParams.get("v");
  if (param && VIDEO_ID.test(param)) return param;
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] === "embed" || segments[0] === "shorts" || segments[0] === "live") {
    const id = segments[1] ?? "";
    return VIDEO_ID.test(id) ? id : null;
  }
  return null;
}

/**
 * Interprets whatever the host pasted. A bare 11-character id is accepted as
 * YouTube; a URL is only accepted when it is genuinely a YouTube watch URL.
 */
export function parseWatchSource(input: string): WatchSource | null {
  const raw = input.trim();
  if (raw.length === 0) return null;

  if (VIDEO_ID.test(raw)) {
    return {
      kind: "youtube",
      providerId: "youtube",
      videoId: raw,
      url: `https://www.youtube.com/watch?v=${raw}`,
      label: "YouTube",
    };
  }

  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (YOUTUBE_HOSTS.has(url.hostname)) {
    const videoId = readYouTubeId(url);
    if (!videoId) return null;
    return {
      kind: "youtube",
      providerId: "youtube",
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      label: "YouTube",
    };
  }

  const providerId = url.hostname.replace(/^www\./, "");
  return { kind: "external", providerId, url: url.toString(), label: providerId };
}

/** The honest capability statement for a parsed source. */
export function watchSourceCapability(source: WatchSource | null): WatchSourceCapability {
  if (source?.kind === "youtube") {
    return {
      providerId: "youtube",
      displayName: "YouTube",
      supported: true,
      playbackControlMode: "automatic",
      requiresUserSubscription: false,
      requiresExtensionOrCompanion: false,
      supportedPlatforms: ["web-desktop", "web-mobile"],
      limitations: [
        "Age-restricted or embed-disabled videos cannot play inside StreamFlow.",
        "Each viewer sees advertising served by YouTube on their own account.",
      ],
    };
  }

  return {
    providerId: source?.providerId ?? "unknown",
    displayName: source?.label ?? "This service",
    supported: false,
    playbackControlMode: "unavailable",
    requiresUserSubscription: true,
    requiresExtensionOrCompanion: true,
    supportedPlatforms: [],
    limitations: [
      "StreamFlow cannot start, pause, or seek this service for you.",
      "Everyone needs their own account, and plays in that service themselves.",
      "The room still coordinates people, chat, voice, and a shared countdown.",
    ],
  };
}

/** Metadata key the room aggregate carries the selected source under. */
export const WATCH_SOURCE_METADATA_KEY = "watch_source";

export function readWatchSource(metadata: Readonly<Record<string, unknown>>): WatchSource | null {
  const stored = metadata[WATCH_SOURCE_METADATA_KEY];
  if (typeof stored !== "string") return null;
  return parseWatchSource(stored);
}
