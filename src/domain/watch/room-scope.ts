/**
 * Room provider scope — product correction pass.
 *
 * A room created from a service tile is *that service's* room. Once a room
 * carries a provider scope, the room must offer that service and nothing
 * else: a scoped room that opens a seventeen-service grid is not a watch
 * party, it is a launcher with room chrome.
 *
 * Pure derivation, no React, no repository. Two responsibilities only:
 * translating a catalog key into the watch registry's own id, and deciding
 * which services a room may offer.
 */
import {
  WATCH_PROVIDERS,
  watchProviderById,
  type RoomMediaRef,
  type WatchProviderCapability,
} from "./watch-source";

/**
 * Services removed from the product. A blocked key never becomes a scope,
 * never reaches a shelf, and never reaches a room's provider list.
 */
export const BLOCKED_PROVIDER_KEYS: readonly string[] = Object.freeze(["youtube"]);

export function isBlockedProviderKey(key: string | null | undefined): boolean {
  return key !== null && key !== undefined && BLOCKED_PROVIDER_KEYS.includes(key.toLowerCase());
}

/**
 * Catalog and shelf keys mapped onto watch-registry ids. The catalog names
 * brands the way a database row does; the watch registry names them the way
 * the room does. One table reconciles them, so no surface guesses.
 */
const KEY_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  netflix: "netflix",
  prime_video: "prime",
  primevideo: "prime",
  prime: "prime",
  disney_hotstar: "hotstar",
  hotstar: "hotstar",
  jiohotstar: "hotstar",
  disney_plus: "disney",
  disney: "disney",
  jiocinema: "jiocinema",
  sonyliv: "sonyliv",
  sony_liv: "sonyliv",
  mx_player: "mxplayer",
  mxplayer: "mxplayer",
  discovery_plus: "discovery_plus",
  discoveryplus: "discovery_plus",
  jiotv: "jiotv",
  zee5: "zee5",
  apple_tv_plus: "appletv",
  appletv: "appletv",
  hbo_max: "hbo_max",
  hulu: "hulu",
  peacock: "peacock",
  paramount_plus: "paramount_plus",
  crunchyroll: "crunchyroll",
  google_drive: "google_drive",
  local_file: "direct",
  direct: "direct",
});

/**
 * The watch-registry id for a catalog/shelf key, or null when the product
 * does not describe that service. A blocked key never resolves.
 */
export function resolveWatchProviderId(key: string | null | undefined): string | null {
  if (!key || isBlockedProviderKey(key)) return null;
  const normalized = key.trim().toLowerCase();
  const aliased = KEY_ALIASES[normalized] ?? normalized;
  return watchProviderById(aliased) ? aliased : null;
}

export interface RoomScopeInput {
  /** Catalog key the room was created against, if any. */
  readonly scopeKey: string | null;
  /** The room's shared selection, which also pins the scope once made. */
  readonly mediaRef: RoomMediaRef | null;
}

export interface RoomScope {
  /** The single service this room is about, or null for an open room. */
  readonly providerId: string | null;
  readonly isScoped: boolean;
  /** Exactly what the room may offer: one service, or the whole registry. */
  readonly providers: readonly WatchProviderCapability[];
}

/**
 * A room's scope. The selection wins over the creation key, because what the
 * room actually chose is stronger evidence than what it was created from.
 */
export function deriveRoomScope({ scopeKey, mediaRef }: RoomScopeInput): RoomScope {
  const fromMedia = mediaRef ? resolveWatchProviderId(mediaRef.providerId) : null;
  const providerId = fromMedia ?? resolveWatchProviderId(scopeKey);
  const capability = providerId ? watchProviderById(providerId) : null;

  if (!capability) {
    return { providerId: null, isScoped: false, providers: WATCH_PROVIDERS };
  }
  return { providerId: capability.providerId, isScoped: true, providers: [capability] };
}
