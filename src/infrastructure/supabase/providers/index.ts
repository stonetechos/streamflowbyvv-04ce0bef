/**
 * Supabase provider adapter registration — Sprint 2.2.
 *
 * Conditional and idempotent, exactly like the Sprint 1.7 room cluster: with
 * no persistence endpoint configured nothing is bound and the picker reports
 * an unavailable catalog instead of crashing.
 */
import {
  PROVIDER_CATALOG_REPOSITORY,
  PROVIDER_CONTEXT_PREFERENCE_REPOSITORY,
  PROVIDER_PREFERENCE_REPOSITORY,
} from "@/repository/providers/provider-repository.types";
import { bindRepository, isRepositoryBound } from "@/repository/repository-registry";

import { getBrowserDataConnection, type DataConnection } from "../connection";
import { createSupabaseProviderCatalogRepository } from "./supabase-provider-catalog-repository";
import {
  createSupabaseProviderContextRepository,
  createSupabaseProviderPreferenceRepository,
} from "./supabase-provider-preference-repository";

export function registerSupabaseProviderAdapter(connection?: DataConnection): boolean {
  const active = connection ?? getBrowserDataConnection();
  if (!active.isAvailable()) return false;

  if (!isRepositoryBound(PROVIDER_CATALOG_REPOSITORY)) {
    bindRepository(PROVIDER_CATALOG_REPOSITORY, () =>
      createSupabaseProviderCatalogRepository(active),
    );
  }
  if (!isRepositoryBound(PROVIDER_PREFERENCE_REPOSITORY)) {
    bindRepository(PROVIDER_PREFERENCE_REPOSITORY, () =>
      createSupabaseProviderPreferenceRepository(active),
    );
  }
  if (!isRepositoryBound(PROVIDER_CONTEXT_PREFERENCE_REPOSITORY)) {
    bindRepository(PROVIDER_CONTEXT_PREFERENCE_REPOSITORY, () =>
      createSupabaseProviderContextRepository(active),
    );
  }
  return true;
}

export {
  PROVIDER_CAPABILITY_COLUMNS,
  PROVIDER_COLUMNS,
  PROVIDER_COMPLIANCE_RULE_COLUMNS,
  PROVIDER_PREFERENCE_COLUMNS,
  toProvider,
  toProviderCapability,
  toProviderComplianceRule,
  toProviderPreference,
} from "./provider-mapper";
export { createSupabaseProviderCatalogRepository } from "./supabase-provider-catalog-repository";
export {
  createSupabaseProviderContextRepository,
  createSupabaseProviderPreferenceRepository,
} from "./supabase-provider-preference-repository";
