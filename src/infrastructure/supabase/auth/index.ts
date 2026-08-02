/**
 * Supabase authentication adapter — Sprint 1.5 §8/§9.
 *
 * Registration is idempotent and CONDITIONAL: with no persistence endpoint
 * configured, nothing is bound and Domain continues to report
 * `SF-AUTH-PROVIDER-UNAVAILABLE`. A fresh clone with no `.env` still boots.
 *
 * The composition root above Infrastructure calls the neutral seam in
 * `@/infrastructure/identity`; it never imports this folder.
 */
import {
  AUTH_IDENTITY_REPOSITORY,
  AUTH_REPOSITORY,
  ROLE_REPOSITORY,
  SESSION_REPOSITORY,
} from "@/repository/auth/auth-repository.types";
import { bindRepository, isRepositoryBound } from "@/repository/repository-registry";

import { getBrowserDataConnection, type DataConnection } from "../connection";
import { createSupabaseAuthIdentityRepository } from "./supabase-auth-identity-repository";
import { createSupabaseAuthRepository } from "./supabase-auth-repository";
import { createSupabaseRoleRepository } from "./supabase-role-repository";
import { createSupabaseSessionRepository } from "./supabase-session-repository";

/**
 * Binds the four authentication contracts to this adapter.
 * Returns `false` when the connection is not configured, so the caller can
 * report an honest unavailable state instead of a broken one.
 */
export function registerSupabaseAuthAdapter(connection?: DataConnection): boolean {
  const active = connection ?? getBrowserDataConnection();
  if (!active.isAvailable()) return false;

  if (!isRepositoryBound(AUTH_REPOSITORY)) {
    bindRepository(AUTH_REPOSITORY, () => createSupabaseAuthRepository(active));
  }
  if (!isRepositoryBound(SESSION_REPOSITORY)) {
    bindRepository(SESSION_REPOSITORY, () => createSupabaseSessionRepository(active));
  }
  if (!isRepositoryBound(AUTH_IDENTITY_REPOSITORY)) {
    bindRepository(AUTH_IDENTITY_REPOSITORY, () =>
      createSupabaseAuthIdentityRepository(active),
    );
  }
  if (!isRepositoryBound(ROLE_REPOSITORY)) {
    bindRepository(ROLE_REPOSITORY, () => createSupabaseRoleRepository(active));
  }
  return true;
}

export {
  PROFILE_IDENTITY_COLUMNS,
  toAppRoles,
  toAuthError,
  toAuthMethod,
  toAuthSession,
  toIdentity,
  toSubjectId,
  type ProfileRow,
} from "./auth-mapper";
export {
  deserializeSession,
  serializeSession,
  SESSION_SERIALIZATION_VERSION,
  type SerializedAuthSession,
} from "./session-serialization";
export { createSupabaseAuthRepository } from "./supabase-auth-repository";
export {
  createSupabaseSessionRepository,
  resolveDomainSession,
} from "./supabase-session-repository";
export {
  createSupabaseAuthIdentityRepository,
  findProfileBySubject,
} from "./supabase-auth-identity-repository";
export { createSupabaseRoleRepository } from "./supabase-role-repository";
