/**
 * DeepLinkRegistry — Sprint 2.8, Foundation §12, MVP Spec §7.
 *
 * Launch metadata for the providers StreamFlow knows how to point at: the URI
 * scheme their own app registers, the public web page to fall back to, and the
 * store listing for people who do not have the app.
 *
 * What this registry deliberately is not:
 *  - it is not a client, an SDK, or an API surface — it performs no I/O;
 *  - it holds no key, token, cookie, partner id, or affiliate parameter;
 *  - it never yields a media, manifest, licence, or CDN address;
 *  - it never controls playback, and cannot: it only produces strings.
 *
 * Registry entries are code-owned defaults so the app works offline and stays
 * portable, and every field is overridable from catalog metadata
 * (`launch_app_scheme`, `launch_store_ios`, `launch_store_android`,
 * `launch_homepage`) so a correction ships as data, not as a release.
 *
 * Web URLs are NOT built here — `DeepLinkService` (Sprint 2.2) owns that,
 * including its trusted-host check, and this module composes with it rather
 * than duplicating it.
 */
import type { Provider } from "./provider.types";
import type { LaunchPlatform } from "./provider-launch.types";

/**
 * One provider's launch surface.
 *
 * `appScheme` templates use `{ref}`, replaced with the URL-encoded content
 * reference — the same public identifier a person reads off the address bar.
 * A scheme without a reference is still useful: it opens the app's home.
 */
export interface ProviderLaunchEntry {
  /** Per-platform app URI templates. Absent platforms fall back to the web. */
  readonly appScheme: Readonly<Partial<Record<LaunchPlatform, string>>>;
  readonly storeIosUrl: string | null;
  readonly storeAndroidUrl: string | null;
  /** Public landing page, used when there is no content reference yet. */
  readonly homepageUrl: string | null;
}

const EMPTY_ENTRY: ProviderLaunchEntry = Object.freeze({
  appScheme: Object.freeze({}),
  storeIosUrl: null,
  storeAndroidUrl: null,
  homepageUrl: null,
});

/**
 * Curated defaults. Public, documented URI schemes and public store listings
 * only — nothing reverse-engineered, nothing private, nothing that bypasses a
 * provider's own sign-in.
 */
const DEFAULT_ENTRIES: Readonly<Record<string, ProviderLaunchEntry>> = Object.freeze({
  youtube: Object.freeze({
    appScheme: Object.freeze({
      ios: "youtube://www.youtube.com/watch?v={ref}",
      android: "vnd.youtube:{ref}",
    }),
    storeIosUrl: "https://apps.apple.com/app/id544007664",
    storeAndroidUrl: "https://play.google.com/store/apps/details?id=com.google.android.youtube",
    homepageUrl: "https://www.youtube.com",
  }),
  netflix: Object.freeze({
    appScheme: Object.freeze({
      ios: "nflx://www.netflix.com/title/{ref}",
      android: "nflx://www.netflix.com/title/{ref}",
    }),
    storeIosUrl: "https://apps.apple.com/app/id363590051",
    storeAndroidUrl: "https://play.google.com/store/apps/details?id=com.netflix.mediaclient",
    homepageUrl: "https://www.netflix.com",
  }),
  prime_video: Object.freeze({
    appScheme: Object.freeze({
      ios: "aiv://aiv/resume?asin={ref}",
      android: "intent://www.primevideo.com/detail/{ref}#Intent;scheme=https;end",
    }),
    storeIosUrl: "https://apps.apple.com/app/id545519333",
    storeAndroidUrl: "https://play.google.com/store/apps/details?id=com.amazon.avod.thirdpartyclient",
    homepageUrl: "https://www.primevideo.com",
  }),
  disney_hotstar: Object.freeze({
    appScheme: Object.freeze({}),
    storeIosUrl: "https://apps.apple.com/app/id1466982779",
    storeAndroidUrl: "https://play.google.com/store/apps/details?id=in.startv.hotstar",
    homepageUrl: "https://www.hotstar.com",
  }),
  // Local media never leaves the device: there is no app to open and no store
  // page to visit. The member opens their own file in their own player.
  local_file: EMPTY_ENTRY,
});

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readSchemeBag(value: unknown): Readonly<Partial<Record<LaunchPlatform, string>>> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const bag: Partial<Record<LaunchPlatform, string>> = {};
  for (const [platform, template] of Object.entries(value as Record<string, unknown>)) {
    if (typeof template === "string") bag[platform as LaunchPlatform] = template;
  }
  return Object.freeze(bag);
}

export interface DeepLinkRegistry {
  /** Launch metadata for a provider, catalog overrides applied. */
  entryFor(provider: Provider): ProviderLaunchEntry;
  /** True when this provider has any app scheme on this platform. */
  hasAppScheme(provider: Provider, platform: LaunchPlatform): boolean;
  /**
   * The provider's own app URI for a reference, or null when this platform has
   * no scheme. Never throws; a missing reference opens the app's home instead.
   */
  buildAppUri(
    provider: Provider,
    platform: LaunchPlatform,
    reference: string | null,
  ): string | null;
  /** Public store listing for the platform, when one is known. */
  storeUrl(provider: Provider, platform: LaunchPlatform): string | null;
  homepageUrl(provider: Provider): string | null;
}

export function createDeepLinkRegistry(): DeepLinkRegistry {
  const entryFor = (provider: Provider): ProviderLaunchEntry => {
    const fallback = DEFAULT_ENTRIES[provider.key] ?? EMPTY_ENTRY;
    return {
      appScheme: readSchemeBag(provider.metadata["launch_app_scheme"]) ?? fallback.appScheme,
      storeIosUrl: readString(provider.metadata["launch_store_ios"]) ?? fallback.storeIosUrl,
      storeAndroidUrl:
        readString(provider.metadata["launch_store_android"]) ?? fallback.storeAndroidUrl,
      homepageUrl:
        readString(provider.metadata["launch_homepage"]) ??
        provider.homepageUrl ??
        fallback.homepageUrl,
    };
  };

  const schemeTemplate = (provider: Provider, platform: LaunchPlatform): string | null =>
    entryFor(provider).appScheme[platform] ?? null;

  return {
    entryFor,
    hasAppScheme: (provider, platform) => schemeTemplate(provider, platform) !== null,

    buildAppUri(provider, platform, reference) {
      const template = schemeTemplate(provider, platform);
      if (template === null) return null;
      // A template with no placeholder is a valid "open the app" address.
      if (!template.includes("{ref}")) return template;
      if (reference === null) return null;
      return template.replace("{ref}", encodeURIComponent(reference));
    },

    storeUrl(provider, platform) {
      const entry = entryFor(provider);
      if (platform === "ios") return entry.storeIosUrl;
      if (platform === "android") return entry.storeAndroidUrl;
      return null;
    },

    homepageUrl: (provider) => entryFor(provider).homepageUrl,
  };
}

/**
 * Platform detection from a user-agent string.
 *
 * Deliberately a pure function over an explicitly supplied string rather than
 * a global read: Domain must stay runnable under SSR, tests, and Capacitor,
 * and the caller is the one that knows where the string came from. Detection
 * only reorders which destination is tried first; it never gates a launch, so
 * an `unknown` verdict degrades to the web page rather than to a failure.
 */
export function detectLaunchPlatform(userAgent: string | null | undefined): LaunchPlatform {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  // iPadOS reports itself as a Mac; the touch hint is added by the caller.
  if (/android/.test(ua)) return "android";
  if (/windows|macintosh|mac os x|linux|cros/.test(ua)) return "desktop";
  if (/mobile/.test(ua)) return "web";
  return "unknown";
}
