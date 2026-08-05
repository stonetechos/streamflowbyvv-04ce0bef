/**
 * Supabase profile adapter — Milestone E.
 *
 * RLS restricts every statement here to the caller's own profile row; the
 * handle-availability lookup is the one deliberate exception and reads a
 * single non-sensitive column so it cannot be used to enumerate people.
 */
import {
  REPOSITORY_ERRORS,
  RepositoryError,
  type EntityId,
  type ProfileRecord,
  type ProfileRecordPatch,
  type ProfileRepository,
} from "@/repository";

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

  const allocateHandle = async (desired: string, forProfileId: EntityId | null): Promise<string> => {
    requireAvailable(connection, context("allocateHandle"));
    return runQuery<string>(
      connection.client().rpc("allocate_profile_handle", {
        _desired: desired,
        ...(forProfileId ? { _profile_id: forProfileId } : {}),
      }),
      context("allocateHandle"),
    );
  };

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
    allocateHandle,



    /**
     * Allocation and update are two statements, so two people who onboard with
     * the same display name in the same instant can both be handed the same
     * free handle before either has written it. The loser used to surface a
     * bare conflict; it now re-allocates against the newly written row and
     * tries again. Three attempts is generous: each retry observes one more
     * committed handle.
     */
    async update(profileId: EntityId, patch: ProfileRecordPatch): Promise<ProfileRecord> {
      requireAvailable(connection, context("update", profileId));

      const attempt = async (handle: string | undefined): Promise<ProfileRow> =>
        runQuery<ProfileRow>(
          connection
            .client()
            .from("profiles")
            .update({
              ...(patch.displayName === undefined ? {} : { display_name: patch.displayName }),
              ...(handle === undefined ? {} : { handle }),
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

      let handle = patch.handle;
      for (let tries = 0; ; tries += 1) {
        try {
          return toProfileRecord(await attempt(handle));
        } catch (cause) {
          const isConflict =
            cause instanceof RepositoryError && cause.code === REPOSITORY_ERRORS.CONFLICT.code;
          if (!isConflict || handle === undefined || tries >= 2) throw cause;
          handle = await allocateHandle(handle, profileId);
        }
      }
    },
  };
}
