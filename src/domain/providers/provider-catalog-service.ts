/**
 * ProviderCatalogService — Sprint 2.2, Foundation §12, MVP Spec §7.
 *
 * Turns curated catalog data into an adjudicated list the picker can render:
 * every provider carries its status, its implied sync mode (ADR-003), its
 * compliance verdict for the viewer's region, and the reasons behind any
 * restriction. Selection is never permitted implicitly — a provider with no
 * rule is not selectable, because absence of a rule is not permission
 * (Foundation §11).
 *
 * The service owns no transport and no timer; it reads and decides.
 */
import { createServiceToken } from "@/domain/service-registry";
import type { ComplianceRule, ComplianceService } from "@/domain/services/compliance-service";
import type { ProviderService } from "@/domain/services/provider-service";
import type { CapabilitySupportLevel, ProviderStatus } from "@/domain/shared/domain-enums";
import {
  PROVIDER_CATALOG_REPOSITORY,
  PROVIDER_CONTEXT_PREFERENCE_REPOSITORY,
  PROVIDER_PREFERENCE_REPOSITORY,
  isRepositoryBound,
  resolveRepository,
  type ProviderCatalogRepository,
  type ProviderContextPreferenceRepository,
  type ProviderPreferenceRepository,
} from "@/repository";

import type { LaunchPlatform } from "./provider-launch.types";
import { resolveCapabilityTier } from "./provider-tier";
import type {
  Provider,
  ProviderCapabilityEntry,
  ProviderComplianceRuleEntry,
  ProviderSelectionClass,
  ProviderSelectionOption,
} from "./provider.types";

/**
 * The rule class that governs "may a room be built around this provider".
 * Other rule classes (credential storage, content proxying) describe actions
 * StreamFlow performs nowhere, so they inform the UI but never block a pick.
 */
export const PROVIDER_SELECT_RULE_KEY = "compliance.rule.automated_control";

/** Region used when the viewer has expressed none. Global rules still apply. */
export const DEFAULT_REGION_CODE = "GLOBAL";

export interface ProviderCatalogQuery {
  readonly profileId: string | null;
  /** Overrides the stored region; used by Po and by tests, never guessed. */
  readonly regionCode?: string;
  /**
   * Runtime platform used when resolving capability certification (WP9).
   * Absent or unknown resolves to Tier C, exactly as the launch surface does.
   */
  readonly platform?: LaunchPlatform;
}

export interface ProviderCatalogSnapshot {
  readonly options: readonly ProviderSelectionOption[];
  readonly regionCode: string;
  readonly defaultProviderId: string | null;
  /** False when no catalog store is bound; callers degrade, never crash. */
  readonly isAvailable: boolean;
}

export interface ProviderCatalogService {
  isAvailable(): boolean;
  load(query: ProviderCatalogQuery): Promise<ProviderCatalogSnapshot>;
  /** Single lookup against an already-loaded snapshot. Pure. */
  find(snapshot: ProviderCatalogSnapshot, providerId: string): ProviderSelectionOption | null;
}

export interface ProviderCatalogDependencies {
  readonly catalog: ProviderCatalogRepository | null;
  readonly preferences: ProviderPreferenceRepository | null;
  readonly context: ProviderContextPreferenceRepository | null;
  readonly providerService: ProviderService;
  readonly complianceService: ComplianceService;
}

const EMPTY_SNAPSHOT = (regionCode: string): ProviderCatalogSnapshot =>
  Object.freeze({
    options: [],
    regionCode,
    defaultProviderId: null,
    isAvailable: false,
  });

function supportOf(
  capabilities: readonly ProviderCapabilityEntry[],
  capability: ProviderCapabilityEntry["capability"],
): CapabilitySupportLevel {
  return (
    capabilities.find((entry) => entry.capability === capability)?.supportLevel ?? "unverified"
  );
}

/**
 * Status is derived, not stored: the capability matrix is the fact, and
 * `provider_status_history` (Database Spec §3.5) only records transitions.
 */
export function deriveProviderStatus(
  provider: Provider,
  capabilities: readonly ProviderCapabilityEntry[],
): ProviderStatus {
  if (!provider.isEnabled) return "unavailable";
  const control = supportOf(capabilities, "play_pause");
  const local = supportOf(capabilities, "local_playback");
  const link = supportOf(capabilities, "deep_link");

  if (control === "supported" || local === "supported") return "available";
  if (control === "experimental" || link === "supported" || link === "manual_sync") {
    return "manual_only";
  }
  return "unavailable";
}

/**
 * WP9 / PROV-A1: the pre-commit surface obeys the same rule WP7 gave the
 * launch surface. A catalog row may claim control, but a claim is not
 * evidence: `supported` is only ever announced when the capability
 * certification registry proves Tier A for the tuple. Anything else is
 * coordinated manual sync (ADR-014).
 */
function deriveSelectionClass(
  status: ProviderStatus,
  complianceAction: ProviderSelectionOption["complianceAction"],
  hasRule: boolean,
  isControlCertified: boolean,
): ProviderSelectionClass {
  if (!hasRule || complianceAction === "block") return "unavailable";
  if (status === "unavailable" || status === "retired") return "unavailable";
  if (complianceAction === "manual_only" || status === "manual_only") return "manual_sync";
  if (status === "available" && complianceAction === "allow") {
    return isControlCertified ? "supported" : "manual_sync";
  }
  return "unverified";
}

function toComplianceRules(
  entries: readonly ProviderComplianceRuleEntry[],
): readonly ComplianceRule[] {
  return entries.map((entry) => ({
    ruleId: entry.ruleId,
    providerId: entry.providerId,
    scope: entry.scope,
    regionCode: entry.regionCode,
    action: entry.action,
  }));
}

export function createProviderCatalogService(
  deps: ProviderCatalogDependencies,
): ProviderCatalogService {
  const { catalog, preferences, context, providerService, complianceService } = deps;

  return {
    isAvailable: () => catalog !== null,

    async load(query) {
      const requestedRegion = query.regionCode ?? null;
      if (!catalog) return EMPTY_SNAPSHOT(requestedRegion ?? DEFAULT_REGION_CODE);

      const [providers, capabilities, rules] = await Promise.all([
        catalog.listProviders(),
        catalog.listCapabilities(),
        catalog.listComplianceRules(),
      ]);

      const profileId = query.profileId;
      const stored =
        profileId && context
          ? await context.read(profileId)
          : { defaultProviderId: null, regionCode: null };
      const favourites = profileId && preferences ? await preferences.listByProfile(profileId) : [];

      const regionCode = requestedRegion ?? stored.regionCode ?? DEFAULT_REGION_CODE;
      const favouriteIds = new Set(
        favourites.filter((row) => row.isFavorite).map((row) => row.providerId),
      );
      const hiddenIds = new Set(
        favourites.filter((row) => row.isHidden).map((row) => row.providerId),
      );

      const options = providers
        .filter((provider) => !hiddenIds.has(provider.id))
        .map((provider) => {
          const own = capabilities.filter((entry) => entry.providerId === provider.id);
          const ownRules = rules.filter((rule) => rule.providerId === provider.id);
          const selectionRules = ownRules.filter(
            (rule) => rule.ruleKey === PROVIDER_SELECT_RULE_KEY,
          );

          const verdict = complianceService.evaluate({
            providerId: provider.id,
            regionCode,
            attemptedAction: "provider.select",
            origin: "ProviderCatalogService.load",
            rules: toComplianceRules(selectionRules),
          });

          const status = deriveProviderStatus(provider, own);
          const isControlCertified =
            resolveCapabilityTier(
              provider.key,
              query.platform ? { platform: query.platform } : {},
            ).tier === "a";
          const selectionClass = deriveSelectionClass(
            status,
            verdict.action,
            selectionRules.length > 0,
            isControlCertified,
          );

          return Object.freeze({
            provider,
            status,
            syncMode: providerService.resolveSyncMode(supportOf(own, "play_pause")),
            selectionClass,
            isSelectable: selectionClass !== "unavailable" && providerService.isSelectable(status),
            capabilities: own,
            complianceAction: verdict.action,
            complianceRuleId: verdict.ruleId,
            // Every restriction is shown, including the ones that do not block
            // selection: honesty about limits is a product requirement.
            rationaleKeys: ownRules
              .filter((rule) => rule.action !== "allow")
              .map((rule) => rule.rationaleKey),
            isFavorite: favouriteIds.has(provider.id),
            isDefault: stored.defaultProviderId === provider.id,
            supportsDeepLink: supportOf(own, "deep_link") !== "unavailable",
          }) satisfies ProviderSelectionOption;
        })
        .sort((left, right) => {
          if (left.isFavorite !== right.isFavorite) return left.isFavorite ? -1 : 1;
          if (left.isSelectable !== right.isSelectable) return left.isSelectable ? -1 : 1;
          return left.provider.sortOrder - right.provider.sortOrder;
        });

      return Object.freeze({
        options,
        regionCode,
        defaultProviderId: stored.defaultProviderId,
        isAvailable: true,
      });
    },

    find: (snapshot, providerId) =>
      snapshot.options.find((option) => option.provider.id === providerId) ?? null,
  };
}

export function resolveProviderCatalogDependencies(
  providerService: ProviderService,
  complianceService: ComplianceService,
): ProviderCatalogDependencies {
  return {
    catalog: isRepositoryBound(PROVIDER_CATALOG_REPOSITORY)
      ? resolveRepository(PROVIDER_CATALOG_REPOSITORY)
      : null,
    preferences: isRepositoryBound(PROVIDER_PREFERENCE_REPOSITORY)
      ? resolveRepository(PROVIDER_PREFERENCE_REPOSITORY)
      : null,
    context: isRepositoryBound(PROVIDER_CONTEXT_PREFERENCE_REPOSITORY)
      ? resolveRepository(PROVIDER_CONTEXT_PREFERENCE_REPOSITORY)
      : null,
    providerService,
    complianceService,
  };
}

export const PROVIDER_CATALOG_SERVICE =
  createServiceToken<ProviderCatalogService>("ProviderCatalogService");
