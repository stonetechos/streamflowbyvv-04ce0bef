/**
 * AuthRepository adapter — Sprint 1.5 §3.
 *
 * Implements the identity-provider operations declared in Sprint 1.4 against
 * standard Supabase Auth. Only the two v1 methods are supported (MVP §3):
 * email + password, and email magic link. No OAuth provider is configured or
 * referenced here.
 *
 * Return paths are same-origin application paths supplied by the caller; no
 * vendor URL, project reference, or key appears in this module.
 */
import type { AuthOutcome, AuthCredentials, SignUpRequest } from "@/domain/auth/auth.types";
import { authError } from "@/domain/auth/auth-errors";
import type { AuthRepository } from "@/repository/auth/auth-repository.types";

import type { DataConnection } from "../connection";
import { toAuthError } from "./auth-mapper";
import { resolveDomainSession } from "./supabase-session-repository";

/** Builds an absolute return URL from a same-origin path, or omits it on the server. */
function toRedirectUrl(returnPath: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URL(returnPath, window.location.origin).toString();
}

export function createSupabaseAuthRepository(connection: DataConnection): AuthRepository {
  const auth = () => connection.client().auth;

  function assertAvailable(operation: string): void {
    if (!connection.isAvailable()) {
      throw authError("PROVIDER_UNAVAILABLE", { operation });
    }
  }

  return {
    async signUp(request: SignUpRequest): Promise<AuthOutcome> {
      assertAvailable("signUp");

      const { data, error } = await auth().signUp({
        email: request.email,
        password: request.password,
        options: {
          // Profile provisioning is owned by the database (Database Spec §2);
          // these values are carried for the provisioning path, not stored here.
          data: { display_name: request.displayName, locale: request.locale },
          ...(toRedirectUrl("/auth") ? { emailRedirectTo: toRedirectUrl("/auth") } : {}),
        },
      });
      if (error) throw toAuthError(error, "signUp");

      const session = await resolveDomainSession(connection, data.session, "signUp");
      return session
        ? { kind: "session", session }
        : { kind: "verification_required", email: request.email };
    },

    async signIn(credentials: AuthCredentials): Promise<AuthOutcome> {
      assertAvailable("signIn");

      if (credentials.method === "email_magic_link") {
        const redirectTo = toRedirectUrl(credentials.returnPath);
        const { error } = await auth().signInWithOtp({
          email: credentials.email,
          options: redirectTo ? { emailRedirectTo: redirectTo } : {},
        });
        if (error) throw toAuthError(error, "signIn");
        return { kind: "magic_link_sent", email: credentials.email };
      }

      const { data, error } = await auth().signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      if (error) throw toAuthError(error, "signIn");

      const session = await resolveDomainSession(connection, data.session, "signIn");
      if (!session) throw authError("SESSION_MISSING", { operation: "signIn" });
      return { kind: "session", session };
    },

    async signOut(): Promise<void> {
      assertAvailable("signOut");
      const { error } = await auth().signOut();
      if (error) throw toAuthError(error, "signOut");
    },

    async requestPasswordReset(email: string, returnPath: string): Promise<void> {
      assertAvailable("requestPasswordReset");
      const redirectTo = toRedirectUrl(returnPath);
      const { error } = await auth().resetPasswordForEmail(
        email,
        redirectTo ? { redirectTo } : {},
      );
      if (error) throw toAuthError(error, "requestPasswordReset");
    },

    async resendVerification(email: string): Promise<void> {
      assertAvailable("resendVerification");
      const redirectTo = toRedirectUrl("/auth");
      const { error } = await auth().resend({
        type: "signup",
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : {},
      });
      if (error) throw toAuthError(error, "resendVerification");
    },
  };
}
