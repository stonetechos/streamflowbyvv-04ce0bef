/**
 * Watch source and provider capability model — Sprint H2.
 *
 * One place decides what StreamFlow may honestly claim about a service. A
 * provider is described by what it actually permits: whether we may embed it,
 * whether we may drive its transport, whether the viewer needs their own
 * subscription. Everything the room UI says about a provider is read from
 * here, so no screen can overclaim (Constitution §compliance, ADR-014).
 *
 * Nothing in this file touches protection, proxies a stream, or imitates a
 * provider page. The strongest thing StreamFlow ever does to a premium OTT
 * service is open its public URL in the viewer's own browser.
 */

/** How the host tells the room what to watch. */
export type ProviderSelectionMode = "browse" | "paste-link" | "direct-title";

/**
 * How far playback coordination can honestly go.
 *
 * - `automatic`  — StreamFlow drives a player it is permitted to embed.
 * - `assisted`   — StreamFlow cannot drive it, but can time instructions.
 * - `manual`     — people press play themselves, the room only coordinates.
 * - `launch-only`— StreamFlow can open the title, and nothing more.
 * - `unavailable`— nothing is supported for this service.
 */
export type PlaybackControlMode =
  | "automatic"
  | "assisted"
  | "manual"
  | "launch-only"
  | "unavailable";

export interface ProviderCapability {
  readonly providerId: string;
  readonly displayName: string;
  readonly supported: boolean;
  readonly selectionMode: ProviderSelectionMode;
  readonly playbackControlMode: PlaybackControlMode;
  readonly allowsEmbeddedPlayback: boolean;
  readonly allowsFullscreenFromRoom: boolean;
  readonly allowsZoomFromRoom: boolean;
  readonly requiresOwnSubscription: boolean;
  readonly supportedPlatforms: readonly string[];
  readonly limitations: readonly string[];
}

/** Retained name from Sprint H1; the shape is now the full capability record. */
export type WatchSourceCapability = ProviderCapability;

const YOUTUBE: ProviderCapability = {
  providerId: "youtube",
  displayName: "YouTube",
  supported: true,
  selectionMode: "paste-link",
  playbackControlMode: "automatic",
  allowsEmbeddedPlayback: true,
  allowsFullscreenFromRoom: true,
  allowsZoomFromRoom: false,
  requiresOwnSubscription: false,
  supportedPlatforms: ["web-desktop", "web-mobile"],
  limitations: [
    "Age-restricted or embed-disabled videos cannot play inside StreamFlow.",
    "Each viewer sees advertising served by YouTube on their own account.",
  ],
};

const NETFLIX: ProviderCapability = {
  providerId: "netflix",
  displayName: "Netflix",
  supported: true,
  selectionMode: "browse",
  playbackControlMode: "launch-only",
  allowsEmbeddedPlayback: false,
  allowsFullscreenFromRoom: false,
  allowsZoomFromRoom: false,
  requiresOwnSubscription: true,
  supportedPlatforms: ["web-desktop", "web-mobile"],
  limitations: [
    "StreamFlow can open a Netflix title for you — it cannot play, pause, or seek it.",
    "Everyone needs their own Netflix subscription.",
    "Play together on the countdown; the room keeps chat, people, and re-sync prompts.",
  ],
};

const LOCAL: ProviderCapability = {
  providerId: "local",
  displayName: "Direct video link",
  supported: true,
  selectionMode: "paste-link",
  playbackControlMode: "automatic",
  allowsEmbeddedPlayback: true,
  allowsFullscreenFromRoom: true,
  allowsZoomFromRoom: false,
  requiresOwnSubscription: false,
  supportedPlatforms: ["web-desktop", "web-mobile"],
  limitations: [
    "The file has to be openly reachable — no protected or paywalled stream.",
    "Very large files may buffer differently on each device.",
  ],
};

/** Providers offered in the room's provider bar, in display order. */
export const WATCH_PROVIDERS: readonly ProviderCapability[] = Object.freeze([
  NETFLIX,
  YOUTUBE,
  LOCAL,
]);

/** Anything pasted that is not a provider we describe. */
export function unknownProviderCapability(displayName: string): ProviderCapability {
  return {
    providerId: displayName || "unknown",
    displayName: displayName || "This service",
    supported: false,
    selectionMode: "paste-link",
    playbackControlMode: "unavailable",
    allowsEmbeddedPlayback: false,
    allowsFullscreenFromRoom: false,
    allowsZoomFromRoom: false,
    requiresOwnSubscription: true,
    supportedPlatforms: [],
    limitations: [
      "StreamFlow cannot start, pause, or seek this service for you.",
      "Everyone needs their own account and plays it themselves.",
      "The room still coordinates people, chat, and a shared countdown.",
    ],
  };
}

export function providerCapability(providerId: string): ProviderCapability | null {
  return WATCH_PROVIDERS.find((entry) => entry.providerId === providerId) ?? null;
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
      readonly kind: "netflix";
      readonly providerId: "netflix";
      /** Netflix's own public title id, when the link carried one. */
      readonly titleId: string | null;
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

const NETFLIX_HOST = /(^|\.)netflix\.com$/i;

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const NETFLIX_TITLE_ID = /^\d{4,12}$/;

/** Netflix's public browse entry point. */
export const NETFLIX_BROWSE_URL = "https://www.netflix.com/browse";

export function netflixTitleUrl(titleId: string): string {
  return `https://www.netflix.com/title/${titleId}`;
}

/**
 * Reads a Netflix title id out of a public Netflix URL, or out of a bare id.
 * Nothing is fetched and no page is parsed: this is pure URL reading.
 */
export function parseNetflixTitleId(input: string): string | null {
  const raw = input.trim();
  if (raw.length === 0) return null;
  if (NETFLIX_TITLE_ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!NETFLIX_HOST.test(url.hostname)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const index = segments.findIndex((segment) => segment === "title" || segment === "watch");
  const candidate = index >= 0 ? (segments[index + 1] ?? "") : "";
  if (NETFLIX_TITLE_ID.test(candidate)) return candidate;

  const jbv = url.searchParams.get("jbv");
  return jbv && NETFLIX_TITLE_ID.test(jbv) ? jbv : null;
}

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

const DIRECT_VIDEO = /\.(mp4|webm|ogg|ogv|m3u8)$/i;

/**
 * Interprets whatever the host chose or pasted. A bare 11-character id is
 * accepted as YouTube; a URL is accepted as YouTube or Netflix only when it
 * genuinely is one.
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

  if (NETFLIX_HOST.test(url.hostname)) {
    const titleId = parseNetflixTitleId(url.toString());
    return {
      kind: "netflix",
      providerId: "netflix",
      titleId,
      url: titleId ? netflixTitleUrl(titleId) : NETFLIX_BROWSE_URL,
      label: "Netflix",
    };
  }

  const providerId = url.hostname.replace(/^www\./, "");
  if (url.protocol === "https:" && DIRECT_VIDEO.test(url.pathname)) {
    return { kind: "external", providerId: "local", url: url.toString(), label: LOCAL.displayName };
  }

  return { kind: "external", providerId, url: url.toString(), label: providerId };
}

/** The honest capability statement for a parsed source. */
export function watchSourceCapability(source: WatchSource | null): ProviderCapability {
  if (!source) return unknownProviderCapability("This service");
  if (source.kind === "youtube") return YOUTUBE;
  if (source.kind === "netflix") return NETFLIX;
  if (source.providerId === "local") return LOCAL;
  return unknownProviderCapability(source.label);
}

/** Metadata keys the room aggregate carries the selection under. */
export const WATCH_SOURCE_METADATA_KEY = "watch_source";
export const WATCH_TITLE_METADATA_KEY = "watch_title";

export interface WatchSelection {
  readonly source: WatchSource | null;
  /** Host-typed name of the film or show, when they gave one. */
  readonly title: string | null;
}

export function readWatchSource(metadata: Readonly<Record<string, unknown>>): WatchSource | null {
  const stored = metadata[WATCH_SOURCE_METADATA_KEY];
  if (typeof stored !== "string") return null;
  return parseWatchSource(stored);
}

export function readWatchSelection(
  metadata: Readonly<Record<string, unknown>>,
): WatchSelection {
  const title = metadata[WATCH_TITLE_METADATA_KEY];
  return {
    source: readWatchSource(metadata),
    title: typeof title === "string" && title.trim().length > 0 ? title.trim() : null,
  };
}

/** A short, honest label for the media card when no title was given. */
export function watchSelectionLabel(selection: WatchSelection): string | null {
  if (selection.title) return selection.title;
  const source = selection.source;
  if (!source) return null;
  if (source.kind === "netflix") {
    return source.titleId ? `Netflix title ${source.titleId}` : "Netflix";
  }
  if (source.kind === "youtube") return "YouTube video";
  return source.label;
}
