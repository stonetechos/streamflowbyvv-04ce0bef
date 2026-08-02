/**
 * SessionService — Sprint 1.4 §2, Foundation §3 (Domain services).
 *
 * Owns login/logout/session semantics in Domain terms. It depends on repository
 * CONTRACTS only, resolved lazily, so no implementation is required for this
 * module to compile, typecheck or ship (Foundation §2, §5).
 */
import {
  isRepositoryBound,
  resolveRepository,
  type RepositoryToken,
} from "@/repository/repository-registry";
import {
  AUTH_REPOSITORY,
  SESSION_REPOSITORY,
  type AuthRepository,
  type SessionRepository,
} from "@/repository/auth/auth-repository.types";

import { authError } from "./auth-errors";
import type { AuthCredentials, AuthOutcome, AuthSession, SignUpRequest } from "./auth.types";

export interface SessionService {
  /** True only when an identity adapter has been bound at the composition root. */
  readonly isConfigured: boolean;
  signUp(request: SignUpRequest): Promise<AuthOutcome>;
  signIn(credentials: AuthCredentials): Promise<AuthOutcome>;
  signOut(): Promise<void>;
  getCurrentSession(): Promise<AuthSession | null>;
  refreshSession(): Promise<AuthSession | null>;
  requestPasswordReset(email: string, returnPath: string): Promise<void>;
  resendVerification(email: string): Promise<void>;
  onSessionChanged(listener: (session: AuthSession | null) => void): () => void;
  /** Session expiry read against a supplied clock; never against device time alone. */
  isExpired(session: AuthSession, now?: Date): boolean;
}

function require_<T>(token: RepositoryToken<T>, operation: string): T {
  if (!isRepositoryBound(token)) {
    throw authError("PROVIDER_UNAVAILABLE", { operation });
  }
  return resolveRepository(token);
}

export function createSessionService(): SessionService {
  const auth = (operation: string): AuthRepository => require_(AUTH_REPOSITORY, operation);
  const sessions = (operation: string): SessionRepository =>
    require_(SESSION_REPOSITORY, operation);

  return {
    get isConfigured() {
      return isRepositoryBound(AUTH_REPOSITORY) && isRepositoryBound(SESSION_REPOSITORY);
    },

    signUp: (request) => auth("signUp").signUp(request),
    signIn: (credentials) => auth("signIn").signIn(credentials),
    signOut: () => auth("signOut").signOut(),
    requestPasswordReset: (email, returnPath) =>
      auth("requestPasswordReset").requestPasswordReset(email, returnPath),
    resendVerification: (email) => auth("resendVerification").resendVerification(email),

    getCurrentSession: async () => {
      if (!isRepositoryBound(SESSION_REPOSITORY)) return null;
      return resolveRepository(SESSION_REPOSITORY).getCurrentSession();
    },
    refreshSession: () => sessions("refreshSession").refreshSession(),

    onSessionChanged: (listener) => {
      if (!isRepositoryBound(SESSION_REPOSITORY)) return () => {};
      return resolveRepository(SESSION_REPOSITORY).onSessionChanged(listener);
    },

    isExpired: (session, now = new Date()) =>
      session.expiresAt !== undefined && Date.parse(session.expiresAt) <= now.getTime(),
  };
}
