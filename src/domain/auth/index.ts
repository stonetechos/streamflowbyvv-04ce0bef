/**
 * Domain auth public surface — Sprint 1.4.
 * Vendor-free by construction; nothing here imports Infrastructure.
 */
export {
  AUTH_METHODS,
  INITIAL_AUTH_STATE,
  SESSION_STATUSES,
  type AuthCredentials,
  type AuthIdentity,
  type AuthMethod,
  type AuthOutcome,
  type AuthSession,
  type AuthState,
  type AuthSubjectId,
  type EmailPasswordCredentials,
  type MagicLinkRequest,
  type SessionStatus,
  type SignUpRequest,
} from "./auth.types";
export {
  AUTH_ERRORS,
  AuthError,
  authError,
  type AuthErrorContext,
  type AuthErrorKey,
} from "./auth-errors";
export {
  ALLOWED,
  APP_ROLES,
  denied,
  isAppRole,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  type AppRole,
  type AuthorizationVerdict,
  type Permission,
} from "./authorization.types";
export { createSessionService, type SessionService } from "./session-service";
export { createAuthorizationService, type AuthorizationService } from "./authorization-service";
export { createPermissionService, type PermissionService } from "./permission-service";
export {
  AUTHORIZATION_SERVICE,
  PERMISSION_SERVICE,
  SESSION_SERVICE,
  registerAuthServices,
} from "./auth-services";
