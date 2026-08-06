/**
 * Service shelf view model — Milestone H2 (product experience).
 *
 * Presentation only. The shelf is the first thing a person sees, so it must
 * always have something to show: the adjudicated provider catalog supplies the
 * verdict for every service StreamFlow actually knows about, and this module
 * supplies the *presentation* of the wider streaming landscape for the ones it
 * does not know yet.
 *
 * Nothing here decides anything: a brand that is not in the catalog is shown
 * as "coming soon" and cannot be chosen. Selectability, sync mode and the
 * compliance verdict remain Domain's (Build Rules §1).
 */
import type { ProviderOptionView } from "@/features/providers";

/** How a card is labelled. `coming_soon` is presentation-only. */
export type ServiceStatus =
  "supported" | "manual_sync" | "unverified" | "unavailable" | "coming_soon";

export interface ServiceCardView {
  /** Stable presentation key; the catalog key when one exists. */
  readonly key: string;
  /** Provider id when the catalog knows this service, else null. */
  readonly providerId: string | null;
  readonly name: string;
  /** Two-letter monogram used when no artwork is available. */
  readonly monogram: string;
  readonly status: ServiceStatus;
  readonly isChoosable: boolean;
  /** Sprint K.1 — whether a specific title can be opened for this service. */
  readonly supportsDeepLink: boolean;
  /** Token-based accent, so brand tiles never hardcode a colour. */
  readonly accent: "primary" | "info" | "success" | "warning" | "accent";
}

interface BrandSeed {
  readonly key: string;
  readonly name: string;
  readonly monogram: string;
  readonly accent: ServiceCardView["accent"];
  /** Catalog keys this brand may appear under. */
  readonly catalogKeys?: readonly string[];
}

/**
 * The streaming landscape as consumers know it. Presentation copy: brand names
 * are proper nouns and are deliberately not translated.
 */
const BRANDS: readonly BrandSeed[] = [
  { key: "netflix", name: "Netflix", monogram: "N", accent: "primary" },
  { key: "prime_video", name: "Prime Video", monogram: "PV", accent: "info" },
  {
    key: "disney_hotstar",
    name: "Disney+ Hotstar",
    monogram: "D+",
    accent: "info",
    catalogKeys: ["disney_hotstar", "disney_plus", "hotstar"],
  },
  { key: "jiohotstar", name: "JioHotstar", monogram: "JH", accent: "primary" },
  { key: "sonyliv", name: "SonyLIV", monogram: "SL", accent: "accent" },
  { key: "apple_tv_plus", name: "Apple TV+", monogram: "TV", accent: "accent" },
  { key: "crunchyroll", name: "Crunchyroll", monogram: "CR", accent: "warning" },
  { key: "hbo_max", name: "HBO Max", monogram: "HM", accent: "primary" },
  { key: "hulu", name: "Hulu", monogram: "HU", accent: "success" },
  { key: "zee5", name: "ZEE5", monogram: "Z5", accent: "accent" },
  { key: "peacock", name: "Peacock", monogram: "PC", accent: "info" },
  { key: "paramount_plus", name: "Paramount+", monogram: "P+", accent: "info" },
  { key: "tubi", name: "Tubi", monogram: "TB", accent: "warning" },
  { key: "pluto_tv", name: "Pluto TV", monogram: "PL", accent: "info" },
  { key: "google_drive", name: "Google Drive", monogram: "GD", accent: "success" },
  { key: "local_file", name: "Your own file", monogram: "MP", accent: "accent" },
];

function statusOf(option: ProviderOptionView): ServiceStatus {
  return option.selectionClass;
}

/**
 * Merges the adjudicated catalog into the brand shelf. Catalog-backed services
 * come first (favourites first, then default, then catalog order), everything
 * else follows as a graceful "coming soon" placeholder.
 */
export function buildServiceShelf(
  options: readonly ProviderOptionView[],
  translate: (key: string) => string,
): readonly ServiceCardView[] {
  const byKey = new Map<string, ProviderOptionView>();
  for (const option of options) byKey.set(option.key, option);

  const claimed = new Set<string>();
  const cards: ServiceCardView[] = [];

  for (const brand of BRANDS) {
    const keys = brand.catalogKeys ?? [brand.key];
    const match = keys.map((key) => byKey.get(key)).find(Boolean);

    if (match) {
      claimed.add(match.key);
      const name = translate(match.nameKey);
      cards.push({
        key: brand.key,
        providerId: match.id,
        name: name === match.nameKey ? brand.name : name,
        monogram: brand.monogram,
        status: statusOf(match),
        isChoosable: match.isSelectable,
        supportsDeepLink: match.supportsDeepLink,
        accent: brand.accent,
      });
      continue;
    }

    cards.push({
      key: brand.key,
      providerId: null,
      name: brand.name,
      monogram: brand.monogram,
      status: "coming_soon",
      isChoosable: false,
      supportsDeepLink: false,
      accent: brand.accent,
    });
  }

  // Anything the catalog offers that the shelf does not name yet still belongs
  // on the shelf — the catalog is the authority on what is usable.
  for (const option of options) {
    if (claimed.has(option.key)) continue;
    const name = translate(option.nameKey);
    cards.push({
      key: option.key,
      providerId: option.id,
      name: name === option.nameKey ? option.key : name,
      monogram: name.slice(0, 2).toUpperCase(),
      status: statusOf(option),
      isChoosable: option.isSelectable,
      supportsDeepLink: option.supportsDeepLink,
      accent: "accent",
    });
  }

  // Usable services lead; placeholders trail, in landscape order.
  return [...cards].sort((a, b) => Number(b.providerId !== null) - Number(a.providerId !== null));
}

/**
 * Badge copy for a card. The status itself always comes from the adjudicated
 * catalog (or the presentation-only `coming_soon`); this only names it.
 */
export function serviceStatusLabelKey(status: ServiceStatus): string {
  return `home.services.status.${status}`;
}

/**
 * Human brand name for a provider key. Presentation only: a room knows the
 * key ("netflix"), a person knows the name ("Netflix").
 */
export function serviceBrandName(key: string | null | undefined): string | null {
  if (!key) return null;
  const brand = BRANDS.find(
    (candidate) => candidate.key === key || (candidate.catalogKeys ?? []).includes(key),
  );
  return brand?.name ?? null;
}
