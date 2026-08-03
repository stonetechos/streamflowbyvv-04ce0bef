/**
 * Po context — Milestone H1 §9.
 *
 * What Po knows without asking again. Every read goes through a short-lived
 * cache so a three-step plan does not load the home snapshot three times, and
 * so a question like "who's here?" answers from the room already on screen.
 *
 * The cache is invalidated by the executor after any mutation, which is the
 * only way a stale answer can be produced (Milestone H1 §9 — understand the
 * current state without re-querying unnecessarily).
 */
import {
  HOME_READ_MODEL,
  PROFILE_SERVICE,
  PROVIDER_CATALOG_SERVICE,
  SOCIAL_READ_MODEL,
  SOCIAL_SERVICE,
  isServiceBound,
  resolveService,
  type HomeSnapshot,
  type ProviderCatalogSnapshot,
  type SocialOverview,
} from "@/domain";
import type { ProfileSettingsRecord } from "@/repository";
import { logger } from "@/foundation/logging";

const MODULE = "po-context";
/** Long enough to serve one multi-step plan, short enough to stay honest. */
const TTL_MS = 10_000;

export type PoContextArea = "home" | "social" | "providers" | "settings";

interface CacheEntry<T> {
  readonly profileId: string;
  readonly at: number;
  readonly value: Promise<T>;
}

const cache = new Map<PoContextArea, CacheEntry<unknown>>();

function cached<T>(area: PoContextArea, profileId: string, load: () => Promise<T>): Promise<T> {
  const entry = cache.get(area) as CacheEntry<T> | undefined;
  if (entry && entry.profileId === profileId && Date.now() - entry.at < TTL_MS) {
    return entry.value;
  }
  const value = load().catch((cause: unknown) => {
    cache.delete(area);
    throw cause;
  });
  cache.set(area, { profileId, at: Date.now(), value } as CacheEntry<unknown>);
  return value;
}

/** Called after every mutation so the next read reflects what just happened. */
export function invalidatePoContext(...areas: readonly PoContextArea[]): void {
  if (areas.length === 0) {
    cache.clear();
    return;
  }
  for (const area of areas) cache.delete(area);
}

export function loadPoHome(profileId: string): Promise<HomeSnapshot | null> {
  if (!isServiceBound(HOME_READ_MODEL)) return Promise.resolve(null);
  return cached("home", profileId, async () => {
    try {
      return await resolveService(HOME_READ_MODEL).loadHome(profileId);
    } catch (cause) {
      logger.warn("Po could not read home", { module: MODULE, error: cause });
      return null;
    }
  });
}

export function loadPoSocial(profileId: string): Promise<SocialOverview | null> {
  if (!isServiceBound(SOCIAL_READ_MODEL)) return Promise.resolve(null);
  return cached("social", profileId, async () => {
    try {
      const model = resolveService(SOCIAL_READ_MODEL);
      return model.isConfigured ? await model.load(profileId) : null;
    } catch (cause) {
      logger.warn("Po could not read social", { module: MODULE, error: cause });
      return null;
    }
  });
}

export function loadPoProviders(profileId: string): Promise<ProviderCatalogSnapshot | null> {
  if (!isServiceBound(PROVIDER_CATALOG_SERVICE)) return Promise.resolve(null);
  return cached("providers", profileId, async () => {
    try {
      const catalog = resolveService(PROVIDER_CATALOG_SERVICE);
      return catalog.isAvailable() ? await catalog.load({ profileId }) : null;
    } catch (cause) {
      logger.warn("Po could not read providers", { module: MODULE, error: cause });
      return null;
    }
  });
}

export function loadPoSettings(profileId: string): Promise<ProfileSettingsRecord | null> {
  if (!isServiceBound(PROFILE_SERVICE)) return Promise.resolve(null);
  return cached("settings", profileId, async () => {
    try {
      const profiles = resolveService(PROFILE_SERVICE);
      return profiles.isConfigured ? await profiles.getSettings(profileId) : null;
    } catch (cause) {
      logger.warn("Po could not read settings", { module: MODULE, error: cause });
      return null;
    }
  });
}

/**
 * Resolves a person the way the user referred to them: a handle, a display
 * name, or a profile code. Friends are matched first, because "invite Rishi"
 * almost always means the Rishi already known; only then is the directory
 * searched. Returns null rather than a best guess when nothing matches
 * exactly enough (Milestone H1 §10 — never invent data).
 */
export interface PoPersonMatch {
  readonly profileId: string;
  readonly displayName: string;
  readonly handle: string;
}

export async function resolvePoPerson(
  profileId: string,
  term: string,
): Promise<{ readonly match: PoPersonMatch | null; readonly ambiguous: boolean }> {
  const needle = term.trim().toLowerCase().replace(/^@/, "");
  if (needle.length === 0) return { match: null, ambiguous: false };

  const overview = await loadPoSocial(profileId);
  const candidates = [...(overview?.friends ?? []), ...(overview?.recentPartners ?? [])];
  const exact = candidates.filter(
    (person) =>
      person.handle.toLowerCase() === needle ||
      person.displayName.toLowerCase() === needle ||
      person.code.toLowerCase() === needle,
  );
  if (exact.length === 1 && exact[0]) {
    const person = exact[0];
    return {
      match: { profileId: person.profileId, displayName: person.displayName, handle: person.handle },
      ambiguous: false,
    };
  }

  const partial = candidates.filter((person) =>
    person.displayName.toLowerCase().startsWith(needle),
  );
  if (partial.length === 1 && partial[0]) {
    const person = partial[0];
    return {
      match: { profileId: person.profileId, displayName: person.displayName, handle: person.handle },
      ambiguous: false,
    };
  }
  if (partial.length > 1) return { match: null, ambiguous: true };

  if (!isServiceBound(SOCIAL_SERVICE)) return { match: null, ambiguous: false };
  const social = resolveService(SOCIAL_SERVICE);
  if (!social.isConfigured) return { match: null, ambiguous: false };

  try {
    const found = await social.searchProfiles(term.trim(), profileId);
    if (found.length === 1 && found[0]) {
      const person = found[0];
      return {
        match: {
          profileId: person.id,
          displayName: person.displayName,
          handle: person.handle,
        },
        ambiguous: false,
      };
    }
    return { match: null, ambiguous: found.length > 1 };
  } catch (cause) {
    logger.warn("Po could not search the directory", { module: MODULE, error: cause });
    return { match: null, ambiguous: false };
  }
}
