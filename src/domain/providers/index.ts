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
  createDeepLinkRegistry,
  detectLaunchPlatform,
  type DeepLinkRegistry,
  type ProviderLaunchEntry,
} from "./deep-link-registry";
export {
  guidanceHeadingKey,
  guidanceSummaryKey,
  manualSyncGuidanceKeys,
} from "./manual-sync-guidance";
export {
  createNoopProviderLauncher,
  PROVIDER_LAUNCHER,
  type ProviderLauncher,
} from "./provider-launcher";
export {
  createProviderLaunchCoordinator,
  resolveProviderLaunchCoordinatorDependencies,
  PROVIDER_LAUNCH_COORDINATOR,
  type ProviderLaunchCoordinator,
  type ProviderLaunchCoordinatorDependencies,
  type ProviderLaunchRequest,
} from "./provider-launch-coordinator";
export {
  LAUNCH_PLATFORMS,
  LAUNCH_REFUSAL_REASONS,
  LAUNCH_STATUSES,
  LAUNCH_TARGET_KINDS,
  PROVIDER_LAUNCH_CLASSES,
  type LaunchOutcome,
  type LaunchPlatform,
  type LaunchRefusalReason,
  type LaunchStatus,
  type LaunchTarget,
  type LaunchTargetKind,
  type ProviderLaunchClass,
  type ProviderLaunchPlan,
} from "./provider-launch.types";
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
