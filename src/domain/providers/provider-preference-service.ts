/**
 * ProviderPreferenceService — Sprint 2.2, ADR-005.
 *
 * Owns the two small decisions a viewer makes about the catalog: which
 * providers they favour or hide, and which one is their default. ADR-005
 * splits where those live (provider preferences vs the privacy aggregate);
 * this service is the seam that hides the split from everything above.
 *
 * It stores no credential and no viewing history — a favourite is an ordering
 * hint, nothing more (Foundation §11).
 */
import { createServiceToken } from "@/domain/service-registry";
import {
  PROVIDER_CONTEXT_PREFERENCE_REPOSITORY,
  PROVIDER_PREFERENCE_REPOSITORY,
  isRepositoryBound,
  resolveRepository,
  type ProviderContextPreferenceRepository,
  type ProviderPreferenceRepository,
} from "@/repository";

import type { ProviderContextPreferences, ProviderPreference } from "./provider.types";

export interface ProviderPreferenceService {
  isAvailable(): boolean;
  list(profileId: string): Promise<readonly ProviderPreference[]>;
  setFavorite(profileId: string, providerId: string, favorite: boolean): Promise<void>;
  setHidden(profileId: string, providerId: string, hidden: boolean): Promise<void>;
  /** Records that the provider was chosen; used only for ordering. */
  markUsed(profileId: string, providerId: string, at: Date): Promise<void>;
  readContext(profileId: string): Promise<ProviderContextPreferences>;
  setDefaultProvider(profileId: string, providerId: string | null): Promise<void>;
}

export interface ProviderPreferenceDependencies {
  readonly preferences: ProviderPreferenceRepository | null;
  readonly context: ProviderContextPreferenceRepository | null;
}

const NO_CONTEXT: ProviderContextPreferences = Object.freeze({
  defaultProviderId: null,
  regionCode: null,
});

export function createProviderPreferenceService(
  deps: ProviderPreferenceDependencies,
): ProviderPreferenceService {
  const { preferences, context } = deps;

  return {
    isAvailable: () => preferences !== null,

    async list(profileId) {
      return preferences ? preferences.listByProfile(profileId) : [];
    },

    async setFavorite(profileId, providerId, favorite) {
      if (!preferences) return;
      await preferences.upsert(profileId, providerId, { isFavorite: favorite });
    },

    async setHidden(profileId, providerId, hidden) {
      if (!preferences) return;
      await preferences.upsert(profileId, providerId, { isHidden: hidden });
    },

    async markUsed(profileId, providerId, at) {
      if (!preferences) return;
      await preferences.upsert(profileId, providerId, { lastUsedAt: at.toISOString() });
    },

    async readContext(profileId) {
      return context ? context.read(profileId) : NO_CONTEXT;
    },

    async setDefaultProvider(profileId, providerId) {
      if (!context) return;
      await context.setDefaultProvider(profileId, providerId);
    },
  };
}

export function resolveProviderPreferenceDependencies(): ProviderPreferenceDependencies {
  return {
    preferences: isRepositoryBound(PROVIDER_PREFERENCE_REPOSITORY)
      ? resolveRepository(PROVIDER_PREFERENCE_REPOSITORY)
      : null,
    context: isRepositoryBound(PROVIDER_CONTEXT_PREFERENCE_REPOSITORY)
      ? resolveRepository(PROVIDER_CONTEXT_PREFERENCE_REPOSITORY)
      : null,
  };
}

export const PROVIDER_PREFERENCE_SERVICE = createServiceToken<ProviderPreferenceService>(
  "ProviderPreferenceService",
);
