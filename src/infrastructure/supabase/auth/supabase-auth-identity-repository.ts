/**
 * AuthIdentityRepository adapter — Sprint 1.5 §4.
 *
 * Implements the single documented point of auth-provider coupling:
 * `profiles.auth_user_id` (Database Spec §2). Nothing else joins a subject to
 * a profile.
 */
import type { AuthSubjectId } from "@/domain/auth/auth.types";
import type { AuthIdentityRepository } from "@/repository/auth/auth-repository.types";
import type { EntityId } from "@/repository/repository.types";

import type { DataConnection } from "../connection";
import { runMaybe } from "../query-wrapper";
import { PROFILE_IDENTITY_COLUMNS, type ProfileRow } from "./auth-mapper";

export function createSupabaseAuthIdentityRepository(
  connection: DataConnection,
): AuthIdentityRepository {
  return {
    async findProfileIdBySubject(subjectId: AuthSubjectId): Promise<EntityId | null> {
      const profile = await findProfileBySubject(connection, subjectId);
      return profile?.id ?? null;
    },
  };
}

/**
 * Shared by the session adapter: one query, one column list, one place the
 * profile shape is known.
 */
export async function findProfileBySubject(
  connection: DataConnection,
  subjectId: AuthSubjectId,
): Promise<ProfileRow | null> {
  if (!connection.isAvailable()) return null;

  return runMaybe<ProfileRow>(
    connection
      .client()
      .from("profiles")
      .select(PROFILE_IDENTITY_COLUMNS)
      .eq("auth_user_id", subjectId)
      .is("deleted_at", null)
      .maybeSingle(),
    { aggregate: "identity", operation: "findProfileBySubject" },
  );
}
