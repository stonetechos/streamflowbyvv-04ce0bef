/**
 * DeepLinkService — Sprint 2.2, Foundation §12, MVP Spec §7.
 *
 * Constructs the public URL a member opens in the provider's own app or site,
 * with their own account. That is the whole capability:
 *
 * - it NEVER opens, navigates, embeds, or automates anything;
 * - it NEVER produces a media, manifest, or CDN URL;
 * - it NEVER carries a credential, cookie, or token;
 * - it refuses any host the provider did not declare.
 *
 * Templates are code-owned defaults, overridable per provider through catalog
 * metadata (`deep_link_template`, `deep_link_hosts`) so a correction needs a
 * data change, not a release.
 */
import type { ContentReference } from "./content-reference";
import type { Provider } from "./provider.types";

export interface DeepLinkTarget {
  readonly providerKey: string;
  /** Absolute https URL, safe to place in an anchor with `rel=noopener`. */
  readonly url: string;
  /** True when the URL came from the human rather than a template. */
  readonly isUserSupplied: boolean;
}

export type DeepLinkRefusalReason =
  | "unsupported_provider"
  | "missing_reference"
  | "untrusted_host"
  | "not_a_web_link";

export type DeepLinkResult =
  | { readonly ok: true; readonly target: DeepLinkTarget }
  | { readonly ok: false; readonly reason: DeepLinkRefusalReason };

interface DeepLinkRule {
  /** `{ref}` is replaced by the URL-encoded reference value. */
  readonly template: string | null;
  readonly hosts: readonly string[];
}

/** Public, human-visible landing pages only (MVP Spec §7). */
const DEFAULT_RULES: Readonly<Record<string, DeepLinkRule>> = Object.freeze({
  youtube: {
    template: "https://www.youtube.com/watch?v={ref}",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
  },
  netflix: {
    template: "https://www.netflix.com/title/{ref}",
    hosts: ["netflix.com", "www.netflix.com"],
  },
  prime_video: {
    template: "https://www.amazon.com/gp/video/detail/{ref}",
    hosts: ["amazon.com", "www.amazon.com", "primevideo.com", "www.primevideo.com"],
  },
  disney_hotstar: {
    template: "https://www.hotstar.com/in/{ref}",
    hosts: ["hotstar.com", "www.hotstar.com"],
  },
  // Local media never leaves the device; there is nothing to link to.
  local_file: { template: null, hosts: [] },
});

function readStringArray(value: unknown): readonly string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? (value as readonly string[])
    : null;
}

function resolveRule(provider: Provider): DeepLinkRule {
  const fallback = DEFAULT_RULES[provider.key] ?? { template: null, hosts: [] };
  const template = provider.metadata["deep_link_template"];
  const hosts = readStringArray(provider.metadata["deep_link_hosts"]);
  return {
    template: typeof template === "string" ? template : fallback.template,
    hosts: hosts ?? fallback.hosts,
  };
}

function isTrustedHttps(url: string, hosts: readonly string[]): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && hosts.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export interface DeepLinkService {
  /** True when this provider can be linked to at all. */
  supports(provider: Provider): boolean;
  /** Never throws: refusal is a value, so the UI can explain it. */
  build(provider: Provider, reference: ContentReference | null): DeepLinkResult;
}

export function createDeepLinkService(): DeepLinkService {
  const build = (provider: Provider, reference: ContentReference | null): DeepLinkResult => {
    const rule = resolveRule(provider);
    if (reference === null) return { ok: false, reason: "missing_reference" };
    if (reference.kind === "local_file") return { ok: false, reason: "not_a_web_link" };

    if (reference.kind === "provider_url") {
      if (!isTrustedHttps(reference.value, rule.hosts)) {
        return { ok: false, reason: "untrusted_host" };
      }
      return {
        ok: true,
        target: { providerKey: provider.key, url: reference.value, isUserSupplied: true },
      };
    }

    if (!rule.template) return { ok: false, reason: "unsupported_provider" };
    const url = rule.template.replace("{ref}", encodeURIComponent(reference.value));
    if (!isTrustedHttps(url, rule.hosts)) return { ok: false, reason: "untrusted_host" };
    return {
      ok: true,
      target: { providerKey: provider.key, url, isUserSupplied: false },
    };
  };

  return {
    supports: (provider) => resolveRule(provider).template !== null,
    build,
  };
}
