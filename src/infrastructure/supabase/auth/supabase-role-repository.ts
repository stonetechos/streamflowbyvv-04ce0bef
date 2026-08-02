/**
 * RoleRepository adapter — Sprint 1.5 §4, ADR-009.
 *
 * Privilege is read through the security-definer `has_role` function, never
 * from a client-trusted column and never from local storage. The adapter maps
 * rows to `AppRole` and drops anything unrecognised — an unknown string is not
 * a privilege.
 */
import type { AppRole } from "@/domain/auth/authorization.types";
import type { RoleRepository } from "@/repository/auth/auth-repository.types";
import type { EntityId } from "@/repository/repository.types";

import type { DataConnection } from "../connection";
import { runQuery } from "../query-wrapper";
import { toAppRoles } from "./auth-mapper";

export function createSupabaseRoleRepository(connection: DataConnection): RoleRepository {
  return {
    async listRoles(profileId: EntityId): Promise<readonly AppRole[]> {
      if (!connection.isAvailable()) return [];

      const rows = await runQuery<{ role: string }[]>(
        connection.client().from("user_roles").select("role").eq("profile_id", profileId),
        { aggregate: "user_roles", operation: "listRoles", entityId: profileId },
      );
      return toAppRoles(rows);
    },

    async hasRole(profileId: EntityId, role: AppRole): Promise<boolean> {
      if (!connection.isAvailable()) return false;

      const result = await runQuery<boolean>(
        connection.client().rpc("has_role", { _profile_id: profileId, _role: role }),
        { aggregate: "user_roles", operation: "hasRole", entityId: profileId },
      );
      return result === true;
    },
  };
}
