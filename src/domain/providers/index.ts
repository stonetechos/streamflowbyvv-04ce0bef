/**
 * Provider domain surface — Sprint 2.2.
 * Types, catalog adjudication, preferences, and deep-link construction.
 */
export {
  CONTENT_REFERENCE_KINDS,
  createContentReference,
  parseContentReference,
  serializeContentReference,
  type ContentReference,
  type ContentReferenceDraft,
  type ContentReferenceKind,
} from "./content-reference";
export {
  createDeepLinkService,
  type DeepLinkResult,
  type DeepLinkRefusalReason,
  type DeepLinkService,
  type DeepLinkTarget,
} from "./deep-link-service";
export {
  createProviderCatalogService,
  deriveProviderStatus,
  resolveProviderCatalogDependencies,
  DEFAULT_REGION_CODE,
  PROVIDER_CATALOG_SERVICE,
  PROVIDER_SELECT_RULE_KEY,
  type ProviderCatalogDependencies,
  type ProviderCatalogQuery,
  type ProviderCatalogService,
  type ProviderCatalogSnapshot,
} from "./provider-catalog-service";
export {
  createProviderPreferenceService,
  resolveProviderPreferenceDependencies,
  PROVIDER_PREFERENCE_SERVICE,
  type ProviderPreferenceDependencies,
  type ProviderPreferenceService,
} from "./provider-preference-service";
export {
  PROVIDER_SELECTION_CLASSES,
  type Provider,
  type ProviderCapabilityEntry,
  type ProviderComplianceRuleEntry,
  type ProviderContextPreferences,
  type ProviderMetadata,
  type ProviderPreference,
  type ProviderPreferencePatch,
  type ProviderSelectionClass,
  type ProviderSelectionOption,
} from "./provider.types";
