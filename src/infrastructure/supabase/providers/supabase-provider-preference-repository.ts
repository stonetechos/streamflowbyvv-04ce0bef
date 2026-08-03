/**
 * Supabase provider preference adapters — Sprint 2.2, ADR-005.
 *
 * Two adapters, because ADR-005 puts the fields in two aggregates: favourites
 * and hiding live in `provider_preferences`, while the default provider is a
 * privacy-scoped field and the region a localization-scoped one. RLS scopes
 * every row to the caller's own profile.
 */
import type {
  ProviderContextPreferences,
  ProviderPreference,
  ProviderPreferencePatch,
} from "@/domain/providers/provider.types";
import type {
  ProviderContextPreferenceRepository,
  ProviderPreferenceRepository,
} from "@/repository/providers/provider-repository.types";
import type { EntityId } from "@/repository/repository.types";

import type { DataConnection } from "../connection";
import { runCommand, runMaybe, runQuery } from "../query-wrapper";
import { requireAvailable } from "../rooms/room-query-support";
import {
  PROVIDER_PREFERENCE_COLUMNS,
  toProviderPreference,
  type ProviderPreferenceRow,
} from "./provider-mapper";

const AGGREGATE = "provider_preferences";

export function createSupabaseProviderPreferenceRepository(
  connection: DataConnection,
): ProviderPreferenceRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  return {
    async listByProfile(profileId: EntityId): Promise<readonly ProviderPreference[]> {
      requireAvailable(connection, context("listByProfile", profileId));
      const rows = await runQuery<ProviderPreferenceRow[]>(
        connection
          .client()
          .from("provider_preferences")
          .select(PROVIDER_PREFERENCE_COLUMNS)
          .eq("profile_id", profileId),
        context("listByProfile", profileId),
      );
      return (rows ?? []).map(toProviderPreference);
    },

    async upsert(
      profileId: EntityId,
      providerId: EntityId,
      patch: ProviderPreferencePatch,
    ): Promise<ProviderPreference> {
      requireAvailable(connection, context("upsert", providerId));
      const row = await runQuery<ProviderPreferenceRow>(
        connection
          .client()
          .from("provider_preferences")
          .upsert(
            {
              profile_id: profileId,
              provider_id: providerId,
              ...(patch.isFavorite === undefined ? {} : { is_favorite: patch.isFavorite }),
              ...(patch.isHidden === undefined ? {} : { is_hidden: patch.isHidden }),
              ...(patch.lastUsedAt === undefined ? {} : { last_used_at: patch.lastUsedAt }),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "profile_id,provider_id" },
          )
          .select(PROVIDER_PREFERENCE_COLUMNS)
          .single(),
        context("upsert", providerId),
      );
      return toProviderPreference(row);
    },
  };
}

export function createSupabaseProviderContextRepository(
  connection: DataConnection,
): ProviderContextPreferenceRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: "provider_context_preferences",
    operation,
    ...(entityId ? { entityId } : {}),
  });

  return {
    async read(profileId: EntityId): Promise<ProviderContextPreferences> {
      requireAvailable(connection, context("read", profileId));
      const client = connection.client();

      // A person who has never opened settings has no preference rows at all;
      // "no row" is a legitimate outcome here, not a missing record.
      const [privacy, localization] = await Promise.all([
        runMaybe<{ default_provider_id: string | null }>(
          client
            .from("privacy_preferences")
            .select("default_provider_id")
            .eq("profile_id", profileId)
            .maybeSingle(),
          context("read:privacy", profileId),
        ),
        runMaybe<{ region_code: string | null }>(
          client
            .from("localization_preferences")
            .select("region_code")
            .eq("profile_id", profileId)
            .maybeSingle(),
          context("read:localization", profileId),
        ),
      ]);

      return {
        defaultProviderId: privacy?.default_provider_id ?? null,
        regionCode: localization?.region_code ?? null,
      };
    },

    async setDefaultProvider(profileId: EntityId, providerId: EntityId | null): Promise<void> {
      requireAvailable(connection, context("setDefaultProvider", profileId));
      await runCommand(
        connection.client().from("privacy_preferences").upsert(
          {
            profile_id: profileId,
            default_provider_id: providerId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "profile_id" },
        ),
        context("setDefaultProvider", profileId),
      );
    },
  };
}
