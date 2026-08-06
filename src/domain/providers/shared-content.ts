/**
 * Shared content intake — Milestone L (Share-to-StreamFlow).
 *
 * The primary journey now begins inside the provider's own application: a
 * person opens a title, taps the system share button, and picks StreamFlow.
 * What arrives is exactly what a share sheet gives: a public address, some
 * plain text, and sometimes a title. This module turns that into the neutral
 * `ContentReference` the room already understands.
 *
 * What this is NOT, and must never become:
 *  - it does not call a provider API, scrape a page, or fetch a manifest;
 *  - it does not authenticate, and it never touches a credential or cookie;
 *  - it does not imply StreamFlow can play, select, or control anything.
 *
 * It reads text the operating system handed over, and nothing else. Every
 * host it accepts comes from the same trusted-host table `DeepLinkService`
 * links with, so a share can never introduce an address the product would
 * otherwise refuse to open.
 */
import {
  createContentReference,
  type ContentKind,
  type ContentReference,
} from "./content-reference";
import { DEFAULT_DEEP_LINK_HOSTS } from "./deep-link-service";

/** Raw fields a Web Share Target (or a pasted link) can supply. */
export interface SharedContentPayload {
  readonly url?: string | null;
  readonly text?: string | null;
  readonly title?: string | null;
}

export type SharedContentRefusal = "no_input" | "not_a_link" | "unrecognized_provider";

/** Everything the room context may carry about what was shared. */
export interface SharedContent {
  readonly providerKey: string;
  /** The public address exactly as shared. Never a media or manifest URL. */
  readonly sharedUrl: string;
  /** Neutral pointer stored on the room (Database Spec §3.2). */
  readonly reference: ContentReference;
  readonly title: string | null;
  readonly seriesTitle: string | null;
  readonly seasonNumber: number | null;
  readonly episodeNumber: number | null;
  readonly contentKind: ContentKind;
  readonly artworkUrl: string | null;
  readonly runtimeMs: number | null;
}

export type SharedContentResult =
  | { readonly ok: true; readonly content: SharedContent }
  | {
      readonly ok: false;
      readonly reason: SharedContentRefusal;
      /** Kept so the screen can show what it did receive. */
      readonly sharedUrl: string | null;
      readonly sharedText: string | null;
    };

const URL_PATTERN = /https?:\/\/[^\s<>"']+/i;

/** Trailing punctuation a share sheet often glues onto the address. */
function tidyUrl(raw: string): string {
  return raw.replace(/[.,;:!)\]}>'"]+$/u, "");
}

function firstUrl(...candidates: readonly (string | null | undefined)[]): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = URL_PATTERN.exec(candidate);
    if (match) return tidyUrl(match[0]);
  }
  return null;
}

/** Which known provider owns this address, using the shared host table. */
function providerKeyForHost(
  url: string,
  hosts: Readonly<Record<string, readonly string[]>>,
): string | null {
  let hostname: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    hostname = parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const [key, list] of Object.entries(hosts)) {
    if (list.includes(hostname)) return key;
    if (list.some((host) => hostname.endsWith(`.${host}`))) return key;
  }
  return null;
}

/**
 * Provider-scoped id, read off the public address the human already had.
 * Returns null whenever the shape is unfamiliar; the full URL is then used.
 */
function extractProviderId(providerKey: string, url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const path = parsed.pathname;

  if (providerKey === "netflix") {
    return /\/title\/(\d+)/.exec(path)?.[1] ?? null;
  }
  if (providerKey === "prime_video") {
    return /\/detail\/([A-Za-z0-9]+)/.exec(path)?.[1] ?? null;
  }
  if (providerKey === "disney_hotstar") {
    return /^\/in\/(.+)$/.exec(path)?.[1] ?? null;
  }
  return null;
}

/** Season and episode, when the shared text names them in plain language. */
function readSeasonEpisode(text: string): { season: number | null; episode: number | null } {
  const combined = /S(?:eason)?\s*(\d{1,2})\s*[:·|,-]?\s*E(?:p(?:isode)?)?\s*(\d{1,3})/i.exec(text);
  if (combined) return { season: Number(combined[1]), episode: Number(combined[2]) };

  const season = /Season\s*(\d{1,2})/i.exec(text);
  const episode = /Episode\s*(\d{1,3})/i.exec(text);
  return {
    season: season ? Number(season[1]) : null,
    episode: episode ? Number(episode[1]) : null,
  };
}

/** Share text is prose; this recovers the human title inside it. */
function readTitles(
  text: string,
  fallbackTitle: string | null,
): { title: string | null; seriesTitle: string | null } {
  const withoutUrl = text.replace(URL_PATTERN, " ").replace(/\s+/g, " ").trim();
  const source = withoutUrl.length > 0 ? withoutUrl : (fallbackTitle ?? "").trim();
  if (source.length === 0) return { title: null, seriesTitle: null };

  const cleaned = source
    .replace(/^(watch|check out|now watching)\s+/i, "")
    .replace(
      /\s+on\s+(netflix|prime video|disney\+?\s*hotstar|hotstar|jiohotstar)\.?$/i,
      "",
    )
    .trim();

  // "Series: Season 4: Chapter One" — the part before the season is the series.
  const parts = cleaned
    .split(/\s*[:|·]\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length >= 2) {
    const seasonIndex = parts.findIndex((part) => /^S(?:eason)?\s*\d/i.test(part));
    if (seasonIndex > 0) {
      const episodeTitle = parts.slice(seasonIndex + 1).join(" · ");
      return {
        title: episodeTitle.length > 0 ? episodeTitle : parts[0]!,
        seriesTitle: parts[0]!,
      };
    }
  }
  return { title: cleaned, seriesTitle: null };
}

function inferContentKind(
  providerKey: string,
  season: number | null,
  episode: number | null,
): ContentKind {
  if (season !== null || episode !== null) return "episode";
  return "movie";
}

/**
 * Turns a share-sheet payload into room context. Pure and total: a share it
 * cannot place is a refusal value the screen explains, never a throw.
 */
export function parseSharedContent(
  payload: SharedContentPayload,
  hosts: Readonly<Record<string, readonly string[]>> = DEFAULT_DEEP_LINK_HOSTS,
): SharedContentResult {
  const rawText = payload.text?.trim() ?? "";
  const rawTitle = payload.title?.trim() ?? "";
  const sharedUrl = firstUrl(payload.url, payload.text, payload.title);

  if (!sharedUrl && rawText.length === 0 && rawTitle.length === 0) {
    return { ok: false, reason: "no_input", sharedUrl: null, sharedText: null };
  }
  if (!sharedUrl) {
    return { ok: false, reason: "not_a_link", sharedUrl: null, sharedText: rawText || rawTitle };
  }

  const providerKey = providerKeyForHost(sharedUrl, hosts);
  if (!providerKey) {
    return {
      ok: false,
      reason: "unrecognized_provider",
      sharedUrl,
      sharedText: rawText || rawTitle,
    };
  }

  const descriptive = [rawTitle, rawText].filter((part) => part.length > 0).join(" · ");
  const { season, episode } = readSeasonEpisode(descriptive);
  const { title, seriesTitle } = readTitles(descriptive, rawTitle);
  const contentKind = inferContentKind(providerKey, season, episode);

  const providerId = extractProviderId(providerKey, sharedUrl);
  const reference = createContentReference({
    providerKey,
    kind: providerId ? "provider_id" : "provider_url",
    value: providerId ?? sharedUrl,
    title,
    contentKind,
    seasonNumber: season,
    episodeNumber: episode,
    // Display metadata only: knowing the address grants no control over it.
    providerMetadata: {
      shared_url: sharedUrl,
      ...(seriesTitle ? { series_title: seriesTitle } : {}),
    },
  });

  return {
    ok: true,
    content: {
      providerKey,
      sharedUrl,
      reference,
      title,
      seriesTitle,
      seasonNumber: season,
      episodeNumber: episode,
      contentKind,
      // A share sheet carries no artwork; branding is the honest fallback.
      artworkUrl: reference.artworkUrl,
      runtimeMs: reference.durationMs,
    },
  };
}

/** Series title carried in provider metadata, when the share named one. */
export function readSeriesTitle(reference: ContentReference | null): string | null {
  const value = reference?.providerMetadata["series_title"];
  return typeof value === "string" && value.length > 0 ? value : null;
}
