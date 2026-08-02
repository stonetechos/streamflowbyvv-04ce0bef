/**
 * Auth repository contracts — Sprint 1.4 §3.
 * Re-exported through `@/repository` so Domain never reaches into a subfolder.
 */
export {
  AUTH_IDENTITY_REPOSITORY,
  AUTH_REPOSITORY,
  ROLE_REPOSITORY,
  SESSION_REPOSITORY,
  type AuthIdentityRepository,
  type AuthRepository,
  type RoleRepository,
  type SessionRepository,
} from "./auth-repository.types";
