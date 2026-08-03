/**
 * Auth feature provider — Sprint 1.4 §8/§11.
 *
 * Orchestrates one capability: knowing who is signed in. It talks to Domain
 * services through the service registry and never to Infrastructure, so a
 * provider swap is invisible here (Foundation §2).
 *
 * With no identity adapter bound, session resolution settles on
 * `unauthenticated` and every mutating call rejects with
 * `SF-AUTH-PROVIDER-UNAVAILABLE` — an honest verdict, not a stub that pretends.
 */
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";

import {
  AUTHORIZATION_SERVICE,
  PERMISSION_SERVICE,
  SESSION_SERVICE,
  registerAuthServices,
  type AppRole,
  type AuthCredentials,
  type AuthOutcome,
  type AuthState,
  type Permission,
  type SignUpRequest,
} from "@/domain/auth";
import { resolveService } from "@/domain";
import { logger } from "@/foundation/logging";

import { authReducer, initialAuthState, isSettled } from "./auth-state";
import { registerAuthFeatureFlags } from "./auth-feature-flags";

registerAuthServices();
registerAuthFeatureFlags();

export interface AuthContextValue extends AuthState {
  /** False until an identity adapter is bound in Infrastructure. */
  readonly isConfigured: boolean;
  readonly isAuthenticated: boolean;
  readonly isSettled: boolean;
  readonly roles: readonly AppRole[];
  signUp: (request: SignUpRequest) => Promise<AuthOutcome>;
  signIn: (credentials: AuthCredentials) => Promise<AuthOutcome>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Sends a reset link. Milestone E — the recovery journey (MVP §3.4). */
  requestPasswordReset: (email: string, returnPath: string) => Promise<void>;
  /** Sets a new password using the session a recovery link established. */
  updatePassword: (newPassword: string) => Promise<void>;
  /** Re-sends the verification email for an address awaiting confirmation. */
  resendVerification: (email: string) => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const [roles, setRoles] = useState<readonly AppRole[]>([]);

  const sessions = resolveService(SESSION_SERVICE);
  const authorization = resolveService(AUTHORIZATION_SERVICE);
  const permissions = resolveService(PERMISSION_SERVICE);

  // Resolve the session once on mount, then follow provider-driven changes.
  useEffect(() => {
    let active = true;
    dispatch({ type: "resolve_started" });

    sessions
      .getCurrentSession()
      .then((session) => {
        if (active) dispatch({ type: "resolved", session });
      })
      .catch((error: unknown) => {
        logger.warn("Session resolution failed", { module: "auth" });
        if (active) dispatch({ type: "failed" });
        return error;
      });

    const unsubscribe = sessions.onSessionChanged((session) => {
      if (active) dispatch({ type: "resolved", session });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [sessions]);

  // Platform privilege is read from the authorization service, never from the
  // session payload the client could tamper with (ADR-009).
  useEffect(() => {
    let active = true;
    const profileId = state.session?.identity.profileId;

    if (!profileId || !authorization.isConfigured) {
      setRoles([]);
      return;
    }

    authorization
      .listRoles(profileId)
      .then((resolved) => {
        if (active) setRoles(resolved);
      })
      .catch(() => {
        if (active) setRoles([]);
      });

    return () => {
      active = false;
    };
  }, [authorization, state.session]);

  const signIn = useCallback(
    async (credentials: AuthCredentials) => {
      dispatch({ type: "authenticating" });
      try {
        const outcome = await sessions.signIn(credentials);
        if (outcome.kind === "session") {
          dispatch({ type: "authenticated", session: outcome.session });
        } else {
          dispatch({ type: "signed_out" });
        }
        return outcome;
      } catch (error) {
        dispatch({ type: "failed" });
        throw error;
      }
    },
    [sessions],
  );

  const signUp = useCallback(
    async (request: SignUpRequest) => {
      dispatch({ type: "authenticating" });
      try {
        const outcome = await sessions.signUp(request);
        if (outcome.kind === "session") {
          dispatch({ type: "authenticated", session: outcome.session });
        } else {
          dispatch({ type: "signed_out" });
        }
        return outcome;
      } catch (error) {
        dispatch({ type: "failed" });
        throw error;
      }
    },
    [sessions],
  );

  const signOut = useCallback(async () => {
    await sessions.signOut();
    dispatch({ type: "signed_out" });
    setRoles([]);
  }, [sessions]);

  const refresh = useCallback(async () => {
    const session = await sessions.refreshSession();
    dispatch({ type: "resolved", session });
  }, [sessions]);

  // Recovery and verification never change local session state: the provider
  // sends an email and the journey continues in the inbox.
  const requestPasswordReset = useCallback(
    (email: string, returnPath: string) => sessions.requestPasswordReset(email, returnPath),
    [sessions],
  );

  const updatePassword = useCallback(
    (newPassword: string) => sessions.updatePassword(newPassword),
    [sessions],
  );

  const resendVerification = useCallback(
    (email: string) => sessions.resendVerification(email),
    [sessions],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isConfigured: sessions.isConfigured,
      isAuthenticated: state.status === "authenticated" && state.session !== null,
      isSettled: isSettled(state.status),
      roles,
      signUp,
      signIn,
      signOut,
      refresh,
      requestPasswordReset,
      updatePassword,
      resendVerification,
      hasRole: (role) => roles.includes(role),
      can: (permission) => permissions.can(roles, permission),
    }),
    [
      permissions,
      refresh,
      requestPasswordReset,
      updatePassword,
      resendVerification,
      roles,
      sessions,
      signIn,
      signOut,
      signUp,
      state,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return context;
}
