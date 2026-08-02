/**
 * Authentication service tokens and composition — Sprint 1.4 §12.
 *
 * Binding happens once, here, and depends on nothing vendor-specific. The
 * services resolve their repositories lazily, so an unbound identity adapter
 * degrades to `SF-AUTH-PROVIDER-UNAVAILABLE` rather than a crash.
 */
import { bindService, createServiceToken, isServiceBound, resolveService } from "../service-registry";

import { createAuthorizationService, type AuthorizationService } from "./authorization-service";
import { createPermissionService, type PermissionService } from "./permission-service";
import { createSessionService, type SessionService } from "./session-service";

export const SESSION_SERVICE = createServiceToken<SessionService>("SessionService");
export const AUTHORIZATION_SERVICE = createServiceToken<AuthorizationService>(
  "AuthorizationService",
);
export const PERMISSION_SERVICE = createServiceToken<PermissionService>("PermissionService");

/** Idempotent: safe to call from any entry point, binds each token once. */
export function registerAuthServices(): void {
  if (!isServiceBound(SESSION_SERVICE)) {
    bindService(SESSION_SERVICE, createSessionService);
  }
  if (!isServiceBound(AUTHORIZATION_SERVICE)) {
    bindService(AUTHORIZATION_SERVICE, createAuthorizationService);
  }
  if (!isServiceBound(PERMISSION_SERVICE)) {
    bindService(PERMISSION_SERVICE, () =>
      createPermissionService(resolveService(AUTHORIZATION_SERVICE)),
    );
  }
}
