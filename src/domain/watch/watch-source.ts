/**
 * Watch source, provider capability model, and shared media reference —
 * Sprint H2, generalized in Sprint H3.
 *
 * One place decides what StreamFlow may honestly claim about a service, and
 * one shape carries the room's decision to every participant. A provider is
 * described by what it actually permits: whether we may embed it, whether we
 * may drive its transport, whether the viewer needs their own subscription.
 * Everything the room UI says about a provider is read from here, so no
 * screen can overclaim (Constitution §compliance, ADR-014).
 *
 * Nothing in this file touches protection, proxies a stream, or imitates a
 * provider page. The strongest thing StreamFlow ever does to a premium OTT
 * service is open its public URL in the viewer's own browser.
 */

/** How the host tells the room what to watch. */
export type ProviderSelectionMode = "browse" | "paste-link" | "direct-title" | "direct-link";

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
  "automatic" | "assisted" | "manual" | "launch-only" | "unavailable";

/**
 * The single definitive description of a service (Sprint H4).
 *
 * Every product-visible claim — tab, chip, instruction, control, limitation —
 * is rendered from this record and from nothing else.
 */
export interface WatchProviderCapability {
  readonly providerId: string;
  readonly displayName: string;
  /** Whether the service exists in the product at all. */
  readonly enabled: boolean;
  /** Whether it may appear as a selectable tab in a room or lobby. */
  readonly visibleInLobby: boolean;
  /** Retained H2 name for `enabled`; kept so older call sites keep reading. */
  readonly supported: boolean;
  readonly selectionMode: ProviderSelectionMode;
  readonly playbackControlMode: PlaybackControlMode;
  readonly allowsEmbeddedPlayback: boolean;
  readonly allowsFullscreenFromRoom: boolean;
  readonly allowsZoomFromRoom: boolean;
  readonly requiresOwnSubscription: boolean;
  readonly requiresProviderLogin: boolean;
  readonly supportedPlatforms: readonly string[];
  readonly limitations: readonly string[];
}

/** Retained name from Sprint H1; the shape is now the full capability record. */
export type WatchSourceCapability = WatchProviderCapability;

const WEB_PLATFORMS = Object.freeze(["web-desktop", "web-mobile"]);

/** The three sentences every launch-only OTT service gets, verbatim. */
function ottLimitations(displayName: string): readonly string[] {
  return Object.freeze([
    `StreamFlow can open a ${displayName} title for you — it cannot play, pause, or seek it.`,
    `Everyone needs their own ${displayName} account.`,
    "Play together on the countdown; the room keeps chat, people, and re-sync prompts.",
  ]);
}

interface ProviderDefinition {
  readonly capability: WatchProviderCapability;
  /** Hostnames this service owns. Null for the non-OTT direct-link entry. */
  readonly hostPattern: RegExp | null;
  /** Public entry point the host is sent to when browsing. */
  readonly browseUrl: string | null;
  /** Path segments that precede a public title identifier, if any. */
  readonly titleSegments: readonly string[];
}

function ottProvider(
  providerId: string,
  displayName: string,
  hostPattern: RegExp,
  browseUrl: string,
  titleSegments: readonly string[],
): ProviderDefinition {
  return Object.freeze({
    capability: Object.freeze({
      providerId,
      displayName,
      enabled: true,
      visibleInLobby: true,
      supported: true,
      selectionMode: "browse" as const,
      playbackControlMode: "launch-only" as const,
      allowsEmbeddedPlayback: false,
      allowsFullscreenFromRoom: false,
      allowsZoomFromRoom: false,
      requiresOwnSubscription: true,
      requiresProviderLogin: true,
      supportedPlatforms: WEB_PLATFORMS,
      limitations: ottLimitations(displayName),
    }),
    hostPattern,
    browseUrl,
    titleSegments: Object.freeze([...titleSegments]),
  });
}

const DIRECT: ProviderDefinition = Object.freeze({
  capability: Object.freeze({
    providerId: "direct",
    displayName: "Direct video link",
    enabled: true,
    visibleInLobby: true,
    supported: true,
    selectionMode: "direct-link" as const,
    playbackControlMode: "automatic" as const,
    allowsEmbeddedPlayback: true,
    allowsFullscreenFromRoom: true,
    allowsZoomFromRoom: false,
    requiresOwnSubscription: false,
    requiresProviderLogin: false,
    supportedPlatforms: WEB_PLATFORMS,
    limitations: Object.freeze([
      "The file has to be openly reachable — no protected or paywalled stream.",
      "Very large files may buffer differently on each device.",
    ]),
  }),
  hostPattern: null,
  browseUrl: null,
  titleSegments: Object.freeze([]),
});


const DEFINITIONS: readonly ProviderDefinition[] = Object.freeze([
  ottProvider("netflix", "Netflix", /(^|\.)netflix\.com$/i, "https://www.netflix.com/browse", [
    "title",
    "watch",
  ]),
  ottProvider(
    "prime",
    "Prime Video",
    /(^|\.)(primevideo\.com|amazon\.[a-z.]+)$/i,
    "https://www.primevideo.com",
    ["detail", "dp"],
  ),
  ottProvider(
    "hotstar",
    "JioHotstar",
    /(^|\.)(hotstar\.com|jiohotstar\.com)$/i,
    "https://www.hotstar.com",
    ["movies", "shows"],
  ),
  ottProvider("disney", "Disney+", /(^|\.)disneyplus\.com$/i, "https://www.disneyplus.com", [
    "movies",
    "series",
    "video",
  ]),
  ottProvider("jiocinema", "JioCinema", /(^|\.)jiocinema\.com$/i, "https://www.jiocinema.com", [
    "movies",
    "tv-shows",
  ]),
  ottProvider("sonyliv", "Sony LIV", /(^|\.)sonyliv\.com$/i, "https://www.sonyliv.com", [
    "movies",
    "shows",
  ]),
  ottProvider("zee5", "ZEE5", /(^|\.)zee5\.com$/i, "https://www.zee5.com", ["movies", "tvshows"]),
  ottProvider("appletv", "Apple TV+", /(^|\.)tv\.apple\.com$/i, "https://tv.apple.com", [
    "movie",
    "show",
    "episode",
  ]),
  DIRECT,
]);

/** Providers offered in the room's provider bar, in display order. */
export const WATCH_PROVIDERS: readonly WatchProviderCapability[] = Object.freeze(
  DEFINITIONS.map((entry) => entry.capability),
);

/** Anything pasted that is not a provider we describe. */
export function unknownProviderCapability(displayName: string): WatchProviderCapability {
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

function definitionById(providerId: string): ProviderDefinition | null {
  return DEFINITIONS.find((entry) => entry.capability.providerId === providerId) ?? null;
}

export function watchProviderById(providerId: string): WatchProviderCapability | null {
  return definitionById(providerId)?.capability ?? null;
}

/** Public entry point for a service, used when the host has picked no title. */
export function providerBrowseUrl(providerId: string): string | null {
  return definitionById(providerId)?.browseUrl ?? null;
}

export type WatchSource =
  | {
      readonly kind: "ott";
      readonly providerId: string;
      /** The service's own public title id, when the link carried one. */
      readonly titleId: string | null;
      readonly url: string;
      readonly label: string;
    }
  | {
      readonly kind: "direct";
      readonly providerId: "direct";
      readonly url: string;
      readonly label: string;
    }
  | {
      readonly kind: "external";
      readonly providerId: string;
      readonly url: string | null;
      readonly label: string;
    };

const DIRECT_VIDEO = /\.(mp4|webm|ogg|ogv|m3u8)$/i;
const TITLE_ID = /^[A-Za-z0-9._-]{2,64}$/;

/** Netflix's public browse entry point. Retained for existing call sites. */
export const NETFLIX_BROWSE_URL = "https://www.netflix.com/browse";

export function netflixTitleUrl(titleId: string): string {
  return `https://www.netflix.com/title/${titleId}`;
}

function toUrl(raw: string): URL | null {
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

function readTitleId(url: URL, definition: ProviderDefinition): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  for (const marker of definition.titleSegments) {
    const index = segments.indexOf(marker);
    const candidate = index >= 0 ? (segments[index + 1] ?? "") : "";
    if (TITLE_ID.test(candidate)) return candidate;
  }
  const last = segments[segments.length - 1] ?? "";
  if (TITLE_ID.test(last) && !definition.titleSegments.includes(last)) return last;
  const jbv = url.searchParams.get("jbv");
  return jbv && TITLE_ID.test(jbv) ? jbv : null;
}

/**
 * Reads a Netflix title id out of a public Netflix URL, or out of a bare id.
 * Nothing is fetched and no page is parsed: this is pure URL reading.
 */
export function parseNetflixTitleId(input: string): string | null {
  const raw = input.trim();
  if (/^\d{4,12}$/.test(raw)) return raw;
  const url = toUrl(raw);
  const netflix = definitionById("netflix");
  if (!url || !netflix?.hostPattern?.test(url.hostname)) return null;
  const id = readTitleId(url, netflix);
  return id && /^\d{4,12}$/.test(id) ? id : null;
}

/**
 * Interprets whatever the host chose or pasted. A URL is attributed to a
 * service only when it genuinely belongs to that service; everything else is
 * described honestly as an external link we can only open.
 */
export function parseWatchSource(input: string): WatchSource | null {
  const raw = input.trim();
  if (raw.length === 0) return null;

  const url = toUrl(raw);
  if (!url) return null;

  for (const definition of DEFINITIONS) {
    if (!definition.hostPattern?.test(url.hostname)) continue;
    return {
      kind: "ott",
      providerId: definition.capability.providerId,
      titleId: readTitleId(url, definition),
      url: url.toString(),
      label: definition.capability.displayName,
    };
  }

  if (url.protocol === "https:" && DIRECT_VIDEO.test(url.pathname)) {
    return {
      kind: "direct",
      providerId: "direct",
      url: url.toString(),
      label: DIRECT.capability.displayName,
    };
  }

  const providerId = url.hostname.replace(/^www\./, "");
  return { kind: "external", providerId, url: url.toString(), label: providerId };
}

/** The honest capability statement for a parsed source. */
export function watchSourceCapability(source: WatchSource | null): WatchProviderCapability {
  if (!source) return unknownProviderCapability("This service");
  return watchProviderById(source.providerId) ?? unknownProviderCapability(source.label);
}

/** Metadata keys the room aggregate carries the selection under. */
export const WATCH_MEDIA_METADATA_KEY = "watch_media";
export const WATCH_SOURCE_METADATA_KEY = "watch_source";
export const WATCH_TITLE_METADATA_KEY = "watch_title";

/**
 * The room's shared answer to "what are we watching?".
 *
 * This is room state, not host state: it is written to the room aggregate and
 * read identically by the host, every guest, every late joiner, and every
 * reconnecting participant.
 */
export interface RoomMediaRef {
  readonly providerId: string;
  readonly providerName: string;
  readonly kind: WatchSource["kind"];
  readonly url: string | null;
  readonly titleId: string | null;
  /** Host-typed name of the film or show, when they gave one. */
  readonly title: string | null;
  readonly selectedAt: string | null;
}

export interface WatchSelection {
  readonly source: WatchSource | null;
  readonly title: string | null;
}

export const EMPTY_WATCH_SELECTION: WatchSelection = Object.freeze({ source: null, title: null });

export function toRoomMediaRef(
  source: WatchSource,
  title: string | null,
  selectedAt: string = new Date().toISOString(),
): RoomMediaRef {
  return {
    providerId: source.providerId,
    providerName: watchSourceCapability(source).displayName,
    kind: source.kind,
    url: source.url,
    titleId: source.kind === "ott" ? source.titleId : null,
    title: title && title.trim().length > 0 ? title.trim() : null,
    selectedAt,
  };
}

/** Rebuilds a playable/openable source from the shared reference. */
export function mediaRefToSource(ref: RoomMediaRef | null): WatchSource | null {
  if (!ref) return null;
  if (ref.url) {
    const parsed = parseWatchSource(ref.url);
    if (parsed) return parsed;
  }
  return { kind: "external", providerId: ref.providerId, url: ref.url, label: ref.providerName };
}

export function mediaRefSelection(ref: RoomMediaRef | null): WatchSelection {
  if (!ref) return EMPTY_WATCH_SELECTION;
  return { source: mediaRefToSource(ref), title: ref.title };
}

function readString(bag: Record<string, unknown>, key: string): string | null {
  const value = bag[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Reads the shared reference off room metadata. Rooms selected before this
 * shape existed still resolve, through the legacy url/title keys.
 */
export function readRoomMediaRef(metadata: Readonly<Record<string, unknown>>): RoomMediaRef | null {
  const raw = metadata[WATCH_MEDIA_METADATA_KEY];
  if (typeof raw === "string" && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw) as Partial<RoomMediaRef>;
      if (parsed && typeof parsed.providerId === "string") {
        return {
          providerId: parsed.providerId,
          providerName:
            typeof parsed.providerName === "string" && parsed.providerName.length > 0
              ? parsed.providerName
              : (watchProviderById(parsed.providerId)?.displayName ?? parsed.providerId),
          kind: parsed.kind === "ott" || parsed.kind === "direct" ? parsed.kind : "external",
          url: typeof parsed.url === "string" ? parsed.url : null,
          titleId: typeof parsed.titleId === "string" ? parsed.titleId : null,
          title: typeof parsed.title === "string" && parsed.title.length > 0 ? parsed.title : null,
          selectedAt: typeof parsed.selectedAt === "string" ? parsed.selectedAt : null,
        };
      }
    } catch {
      // A malformed bag is treated as "nothing chosen", never as a crash.
    }
  }

  const legacyUrl = readString(metadata as Record<string, unknown>, WATCH_SOURCE_METADATA_KEY);
  if (!legacyUrl) return null;
  const source = parseWatchSource(legacyUrl);
  if (!source) return null;
  return toRoomMediaRef(
    source,
    readString(metadata as Record<string, unknown>, WATCH_TITLE_METADATA_KEY),
    // Legacy rows carry no timestamp; the reference is still authoritative.
    "",
  );
}

export function readWatchSelection(metadata: Readonly<Record<string, unknown>>): WatchSelection {
  return mediaRefSelection(readRoomMediaRef(metadata));
}

export function readWatchSource(metadata: Readonly<Record<string, unknown>>): WatchSource | null {
  return readWatchSelection(metadata).source;
}

/** A short, honest label for the media card when no title was given. */
export function watchSelectionLabel(selection: WatchSelection): string | null {
  if (selection.title) return selection.title;
  const source = selection.source;
  if (!source) return null;
  if (source.kind === "ott") {
    return source.titleId ? `${source.label} title ${source.titleId}` : source.label;
  }
  return source.label;
}
