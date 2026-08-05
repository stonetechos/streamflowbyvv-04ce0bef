/**
 * Supabase profile adapter — Milestone E.
 *
 * RLS restricts every statement here to the caller's own profile row; the
 * handle-availability lookup is the one deliberate exception and reads a
 * single non-sensitive column so it cannot be used to enumerate people.
 */
import type { EntityId, ProfileRecord, ProfileRecordPatch, ProfileRepository } from "@/repository";

import type { DataConnection } from "../connection";
import { runMaybe, runQuery } from "../query-wrapper";
import { requireAvailable } from "../rooms/room-query-support";
import { PROFILE_COLUMNS, toProfileRecord, type ProfileRow } from "./profile-mapper";

const AGGREGATE = "profiles";

export function createSupabaseProfileRepository(connection: DataConnection): ProfileRepository {
  const context = (operation: string, entityId?: string) => ({
    aggregate: AGGREGATE,
    operation,
    ...(entityId ? { entityId } : {}),
  });

  return {
    async findById(profileId: EntityId): Promise<ProfileRecord | null> {
      requireAvailable(connection, context("findById", profileId));
      const row = await runMaybe<ProfileRow | null>(
        connection
          .client()
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("id", profileId)
          .is("deleted_at", null)
          .maybeSingle(),
        context("findById", profileId),
      );
      return row ? toProfileRecord(row) : null;
    },

    /**
     * Production Certification Sprint — collisions on `profiles_handle_lower_uq`
     * used to reach the database because RLS hides other people's handles from
     * the client. The allocator decides uniqueness inside the database, under
     * an advisory lock, and returns only the handle it allocated.
     */
    async allocateHandle(desired: string, forProfileId: EntityId | null): Promise<string> {
      requireAvailable(connection, context("allocateHandle"));
      return runQuery<string>(
        connection.client().rpc("allocate_profile_handle", {
          _desired: desired,
          ...(forProfileId ? { _profile_id: forProfileId } : {}),
        }),
        context("allocateHandle"),
      );
    },



    async update(profileId: EntityId, patch: ProfileRecordPatch): Promise<ProfileRecord> {
      requireAvailable(connection, context("update", profileId));
      const row = await runQuery<ProfileRow>(
        connection
          .client()
          .from("profiles")
          .update({
            ...(patch.displayName === undefined ? {} : { display_name: patch.displayName }),
            ...(patch.handle === undefined ? {} : { handle: patch.handle }),
            ...(patch.bio === undefined ? {} : { bio: patch.bio }),
            ...(patch.avatarPreset === undefined ? {} : { avatar_url: patch.avatarPreset }),
            ...(patch.locale === undefined ? {} : { locale: patch.locale }),
            ...(patch.timezone === undefined ? {} : { timezone: patch.timezone }),
            ...(patch.onboardingCompletedAt === undefined
              ? {}
              : { onboarding_completed_at: patch.onboardingCompletedAt }),
            updated_at: new Date().toISOString(),
          })
          .eq("id", profileId)
          .select(PROFILE_COLUMNS)
          .single(),
        context("update", profileId),
      );
      return toProfileRecord(row);
    },
  };
}
