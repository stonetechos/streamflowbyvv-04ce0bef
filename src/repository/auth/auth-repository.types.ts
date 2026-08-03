/**
 * Authentication repository contracts — Sprint 1.4 §3, Foundation §5.
 *
 * Expressed entirely in Domain terms. An Infrastructure adapter (Supabase,
 * Clerk, Auth0, Firebase, custom) implements these; swapping providers is an
 * Infrastructure-only change (Foundation §2, Build Rules §25).
 *
 * No token, cookie, header or vendor client type appears in these signatures —
 * credential material never crosses the Repository boundary (Foundation §10).
 */
import type {
  AuthCredentials,
  AuthOutcome,
  AuthSession,
  AuthSubjectId,
  SignUpRequest,
} from "@/domain/auth/auth.types";
import type { AppRole } from "@/domain/auth/authorization.types";
import type { EntityId } from "@/repository/repository.types";
import { createRepositoryToken, type RepositoryToken } from "@/repository/repository-registry";

/** Identity-provider operations. One implementation per provider, ever. */
export interface AuthRepository {
  signUp(request: SignUpRequest): Promise<AuthOutcome>;
  signIn(credentials: AuthCredentials): Promise<AuthOutcome>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string, returnPath: string): Promise<void>;
  /**
   * Sets a new password for the currently authenticated subject. Sprint H1.6 —
   * the second half of recovery; the provider authorises it from the session
   * the recovery link established, so no old password crosses this boundary.
   */
  updatePassword(newPassword: string): Promise<void>;
  resendVerification(email: string): Promise<void>;
}

/** Session lifecycle, separated so a read-only host can implement it alone. */
export interface SessionRepository {
  /** Resolves the current session, or null when there is none. Never throws on absence. */
  getCurrentSession(): Promise<AuthSession | null>;
  /** Refreshes provider-side session material. Returns the refreshed session. */
  refreshSession(): Promise<AuthSession | null>;
  /**
   * Subscribes to provider-driven session changes. Returns an unsubscribe
   * function; the Feature layer owns the lifetime.
   */
  onSessionChanged(listener: (session: AuthSession | null) => void): () => void;
}

/**
 * Platform-privilege reads. Backed by the security-definer role-check function
 * (ADR-009) — never by a direct client read of `user_roles`, and never by a
 * column on `profiles`.
 */
export interface RoleRepository {
  listRoles(profileId: EntityId): Promise<readonly AppRole[]>;
  hasRole(profileId: EntityId, role: AppRole): Promise<boolean>;
}

/** Resolves a subject to its profile — the `profiles.auth_user_id` join only. */
export interface AuthIdentityRepository {
  findProfileIdBySubject(subjectId: AuthSubjectId): Promise<EntityId | null>;
}

export const AUTH_REPOSITORY: RepositoryToken<AuthRepository> =
  createRepositoryToken<AuthRepository>("AuthRepository");

export const SESSION_REPOSITORY: RepositoryToken<SessionRepository> =
  createRepositoryToken<SessionRepository>("SessionRepository");

export const ROLE_REPOSITORY: RepositoryToken<RoleRepository> =
  createRepositoryToken<RoleRepository>("RoleRepository");

export const AUTH_IDENTITY_REPOSITORY: RepositoryToken<AuthIdentityRepository> =
  createRepositoryToken<AuthIdentityRepository>("AuthIdentityRepository");
