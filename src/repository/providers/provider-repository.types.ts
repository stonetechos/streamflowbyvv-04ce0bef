/**
 * Provider persistence contracts — Sprint 2.2, Foundation §5.
 *
 * Neutral by construction: no table, column, upsert syntax, or driver type.
 * The catalog is read-only from the application's point of view — providers,
 * capabilities, and compliance rules are curated data (Database Spec §3.5) —
 * so only preferences expose writes.
 */
import type {
  Provider,
  ProviderCapabilityEntry,
  ProviderComplianceRuleEntry,
  ProviderContextPreferences,
  ProviderPreference,
  ProviderPreferencePatch,
} from "@/domain/providers/provider.types";
import { createRepositoryToken, type RepositoryToken } from "@/repository/repository-registry";
import type { EntityId } from "@/repository/repository.types";

/** Read-only curated catalog. Never returns retired or soft-deleted rows. */
export interface ProviderCatalogRepository {
  listProviders(): Promise<readonly Provider[]>;
  listCapabilities(): Promise<readonly ProviderCapabilityEntry[]>;
  /** Rules currently in force; expired rules are filtered by the adapter. */
  listComplianceRules(): Promise<readonly ProviderComplianceRuleEntry[]>;
}

/** Per-profile favourites and hiding — Database Spec §3.5. */
export interface ProviderPreferenceRepository {
  listByProfile(profileId: EntityId): Promise<readonly ProviderPreference[]>;
  upsert(
    profileId: EntityId,
    providerId: EntityId,
    patch: ProviderPreferencePatch,
  ): Promise<ProviderPreference>;
}

/**
 * The two fields provider selection needs from preference storage, whose
 * ownership ADR-005 splits across two aggregates. The contract keeps that
 * split invisible above Infrastructure without merging the aggregates.
 */
export interface ProviderContextPreferenceRepository {
  read(profileId: EntityId): Promise<ProviderContextPreferences>;
  setDefaultProvider(profileId: EntityId, providerId: EntityId | null): Promise<void>;
}

export const PROVIDER_CATALOG_REPOSITORY: RepositoryToken<ProviderCatalogRepository> =
  createRepositoryToken<ProviderCatalogRepository>("ProviderCatalogRepository");

export const PROVIDER_PREFERENCE_REPOSITORY: RepositoryToken<ProviderPreferenceRepository> =
  createRepositoryToken<ProviderPreferenceRepository>("ProviderPreferenceRepository");

export const PROVIDER_CONTEXT_PREFERENCE_REPOSITORY: RepositoryToken<ProviderContextPreferenceRepository> =
  createRepositoryToken<ProviderContextPreferenceRepository>("ProviderContextPreferenceRepository");
