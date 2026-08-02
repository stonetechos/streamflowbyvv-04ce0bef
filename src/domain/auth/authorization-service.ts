/**
 * AuthorizationService — Sprint 1.4 §5.
 *
 * The only place platform privilege is decided. Roles are read through the
 * RoleRepository, which is backed by the security-definer role-check function
 * (ADR-009). A role is never read from client storage, never inferred from a
 * session claim the client can edit, and never a profile column.
 */
import { isRepositoryBound, resolveRepository } from "@/repository/repository-registry";
import { ROLE_REPOSITORY } from "@/repository/auth/auth-repository.types";
import type { EntityId } from "@/repository/repository.types";

import { AUTH_ERRORS, authError } from "./auth-errors";
import { ALLOWED, denied, type AppRole, type AuthorizationVerdict } from "./authorization.types";

export interface AuthorizationService {
  readonly isConfigured: boolean;
  listRoles(profileId: EntityId): Promise<readonly AppRole[]>;
  hasRole(profileId: EntityId, role: AppRole): Promise<boolean>;
  hasAnyRole(profileId: EntityId, roles: readonly AppRole[]): Promise<boolean>;
  /** Verdict form, for surfaces that render a reason rather than throwing. */
  authorizeRole(profileId: EntityId, roles: readonly AppRole[]): Promise<AuthorizationVerdict>;
  /** Throwing form, for domain call sites where denial is a failure. */
  requireRole(profileId: EntityId, roles: readonly AppRole[]): Promise<void>;
}

export function createAuthorizationService(): AuthorizationService {
  const roles = (operation: string) => {
    if (!isRepositoryBound(ROLE_REPOSITORY)) {
      throw authError("PROVIDER_UNAVAILABLE", { operation });
    }
    return resolveRepository(ROLE_REPOSITORY);
  };

  const listRoles = (profileId: EntityId) => roles("listRoles").listRoles(profileId);

  const hasAnyRole = async (profileId: EntityId, wanted: readonly AppRole[]) => {
    const held = await roles("hasAnyRole").listRoles(profileId);
    return wanted.some((role) => held.includes(role));
  };

  return {
    get isConfigured() {
      return isRepositoryBound(ROLE_REPOSITORY);
    },
    listRoles,
    hasRole: (profileId, role) => roles("hasRole").hasRole(profileId, role),
    hasAnyRole,
    authorizeRole: async (profileId, wanted) =>
      (await hasAnyRole(profileId, wanted))
        ? ALLOWED
        : denied(AUTH_ERRORS.PERMISSION_DENIED.messageKey),
    requireRole: async (profileId, wanted) => {
      if (!(await hasAnyRole(profileId, wanted))) {
        throw authError("PERMISSION_DENIED", { operation: "requireRole", subjectId: profileId });
      }
    },
  };
}
