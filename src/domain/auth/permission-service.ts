/**
 * PermissionService — Sprint 1.4 §6.
 *
 * Permissions are derived from roles through the ROLE_PERMISSIONS map
 * (`authorization.types.ts`). Derivation is pure and synchronous once roles are
 * known, so Presentation can hide a control without an extra round trip while
 * the real check still happens server-side (ADR-009).
 */
import type { EntityId } from "@/repository/repository.types";

import { AUTH_ERRORS, authError } from "./auth-errors";
import {
  ALLOWED,
  denied,
  ROLE_PERMISSIONS,
  type AppRole,
  type AuthorizationVerdict,
  type Permission,
} from "./authorization.types";
import type { AuthorizationService } from "./authorization-service";

export interface PermissionService {
  /** Pure derivation from an already-resolved role set. */
  permissionsFor(roles: readonly AppRole[]): readonly Permission[];
  can(roles: readonly AppRole[], permission: Permission): boolean;
  canAny(roles: readonly AppRole[], permissions: readonly Permission[]): boolean;
  /** Resolves roles through AuthorizationService, then derives the verdict. */
  authorize(profileId: EntityId, permission: Permission): Promise<AuthorizationVerdict>;
  require(profileId: EntityId, permission: Permission): Promise<void>;
}

export function createPermissionService(
  authorization: AuthorizationService,
): PermissionService {
  const permissionsFor = (roles: readonly AppRole[]): readonly Permission[] => {
    const set = new Set<Permission>();
    for (const role of roles) {
      for (const permission of ROLE_PERMISSIONS[role] ?? []) set.add(permission);
    }
    return [...set];
  };

  const can = (roles: readonly AppRole[], permission: Permission) =>
    permissionsFor(roles).includes(permission);

  const authorize = async (profileId: EntityId, permission: Permission) => {
    const roles = await authorization.listRoles(profileId);
    return can(roles, permission) ? ALLOWED : denied(AUTH_ERRORS.PERMISSION_DENIED.messageKey);
  };

  return {
    permissionsFor,
    can,
    canAny: (roles, permissions) => permissions.some((permission) => can(roles, permission)),
    authorize,
    require: async (profileId, permission) => {
      const verdict = await authorize(profileId, permission);
      if (!verdict.allowed) {
        throw authError("PERMISSION_DENIED", { operation: `require:${permission}`, subjectId: profileId });
      }
    },
  };
}
