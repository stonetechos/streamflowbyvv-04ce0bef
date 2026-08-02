/**
 * Provider domain models — Sprint 2.2, Foundation §12, ADR-003.
 *
 * Neutral value shapes for the provider catalog, the capability matrix, the
 * compliance rules that gate a provider, and the per-profile preferences that
 * order it. No SDK, no credential, no scraping, no media URL: StreamFlow only
 * ever describes a provider and links out to it (Foundation §11).
 *
 * Traceability: Database Spec §3.5 (`providers`, `provider_capabilities`,
 * `provider_compliance_rules`, `provider_preferences`), MVP Spec §7 (Provider
 * Capability Matrix), ADR-003 (sync mode), ADR-005 (preference ownership).
 */
import type {
  CapabilitySupportLevel,
  ComplianceAction,
  ComplianceScope,
  ProviderCapability,
  ProviderCategory,
  ProviderStatus,
  SyncMode,
} from "@/domain/shared/domain-enums";

/** Opaque extension bag; no Domain rule may depend on its contents. */
export type ProviderMetadata = Readonly<Record<string, unknown>>;

/** Catalog entry — Database Spec §3.5 `providers`. */
export interface Provider {
  readonly id: string;
  /** Human-readable display code, e.g. `PRV-000001`. Never a key. */
  readonly code: string;
  /** Stable machine key, e.g. `youtube`. Safe to branch on. */
  readonly key: string;
  /** Translation key for the display name; the catalog stores no prose. */
  readonly displayNameKey: string;
  readonly category: ProviderCategory;
  readonly homepageUrl: string | null;
  readonly logoAssetKey: string | null;
  readonly isEnabled: boolean;
  readonly sortOrder: number;
  readonly metadata: ProviderMetadata;
}

/** One row of the capability matrix — MVP Spec §7. */
export interface ProviderCapabilityEntry {
  readonly providerId: string;
  readonly capability: ProviderCapability;
  readonly supportLevel: CapabilitySupportLevel;
  readonly notesKey: string | null;
  readonly verifiedAt: string | null;
}

/**
 * A compliance rule as stored. `ruleKey` names the action class the rule
 * governs (e.g. `compliance.rule.automated_control`), which is what lets a
 * caller ask about one attempted action instead of the whole provider.
 */
export interface ProviderComplianceRuleEntry {
  readonly ruleId: string;
  readonly providerId: string;
  readonly ruleKey: string;
  readonly action: ComplianceAction;
  readonly scope: ComplianceScope;
  readonly regionCode: string | null;
  readonly rationaleKey: string;
}

/** Per-profile ordering signal — Database Spec §3.5 `provider_preferences`. */
export interface ProviderPreference {
  readonly id: string;
  readonly profileId: string;
  readonly providerId: string;
  readonly isFavorite: boolean;
  readonly isHidden: boolean;
  readonly lastUsedAt: string | null;
}

export interface ProviderPreferencePatch {
  readonly isFavorite?: boolean;
  readonly isHidden?: boolean;
  readonly lastUsedAt?: string | null;
}

/**
 * Where the viewer's default provider and region live (ADR-005): the default
 * provider is a privacy-scoped preference, the region a localization one.
 * Modelled together because provider selection reads both and nothing else.
 */
export interface ProviderContextPreferences {
  readonly defaultProviderId: string | null;
  readonly regionCode: string | null;
}

/**
 * How a provider is labelled in the picker — MVP Spec §7.
 * `unavailable` covers both disabled and compliance-blocked providers.
 */
export const PROVIDER_SELECTION_CLASSES = [
  "supported",
  "manual_sync",
  "unverified",
  "unavailable",
] as const;
export type ProviderSelectionClass = (typeof PROVIDER_SELECTION_CLASSES)[number];

/** Everything the picker needs about one provider, already adjudicated. */
export interface ProviderSelectionOption {
  readonly provider: Provider;
  readonly status: ProviderStatus;
  /** Sync mode this provider implies if chosen (ADR-003). */
  readonly syncMode: SyncMode;
  readonly selectionClass: ProviderSelectionClass;
  readonly isSelectable: boolean;
  readonly capabilities: readonly ProviderCapabilityEntry[];
  /** Compliance verdict for `provider.select` in the viewer's region. */
  readonly complianceAction: ComplianceAction;
  readonly complianceRuleId: string;
  /** Translation keys explaining every restriction that applies. */
  readonly rationaleKeys: readonly string[];
  readonly isFavorite: boolean;
  readonly isDefault: boolean;
  readonly supportsDeepLink: boolean;
}
