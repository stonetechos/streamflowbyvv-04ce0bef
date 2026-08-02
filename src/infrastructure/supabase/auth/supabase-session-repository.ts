/**
 * SessionRepository adapter — Sprint 1.5 §3/§6.
 *
 * Owns session resolution, refresh, and the provider-driven auth state
 * listener. Every vendor session is joined to a profile before it becomes a
 * Domain session: an authenticated subject without a profile row is NOT an
 * identity this application recognises, and is reported as no session rather
 * than as a half-populated one.
 */
import type { Session } from "@supabase/supabase-js";

import type { AuthSession } from "@/domain/auth/auth.types";
import { logger } from "@/foundation/logging";
import type { SessionRepository } from "@/repository/auth/auth-repository.types";

import type { DataConnection } from "../connection";
import { toAuthError, toAuthSession } from "./auth-mapper";
import { findProfileBySubject } from "./supabase-auth-identity-repository";

export async function resolveDomainSession(
  connection: DataConnection,
  session: Session | null,
  operation: string,
): Promise<AuthSession | null> {
  if (!session?.user) return null;

  const profile = await findProfileBySubject(connection, session.user.id);
  if (!profile) {
    // Subject exists at the identity provider but has no profile row (not yet
    // provisioned, soft-deleted, or hidden by row level security).
    logger.warn("Authenticated subject has no readable profile", {
      module: "auth",
      operation,
    });
    return null;
  }
  return toAuthSession(session, profile);
}

export function createSupabaseSessionRepository(connection: DataConnection): SessionRepository {
  const auth = () => connection.client().auth;

  return {
    async getCurrentSession(): Promise<AuthSession | null> {
      if (!connection.isAvailable()) return null;

      const { data, error } = await auth().getSession();
      if (error) throw toAuthError(error, "getCurrentSession");
      return resolveDomainSession(connection, data.session, "getCurrentSession");
    },

    async refreshSession(): Promise<AuthSession | null> {
      if (!connection.isAvailable()) return null;

      const { data, error } = await auth().refreshSession();
      if (error) throw toAuthError(error, "refreshSession");
      return resolveDomainSession(connection, data.session, "refreshSession");
    },

    onSessionChanged(listener: (session: AuthSession | null) => void): () => void {
      if (!connection.isAvailable()) return () => {};

      const { data } = auth().onAuthStateChange((event, session) => {
        // Token refreshes do not change identity; re-emitting them would churn
        // every consumer roughly hourly for no observable difference.
        if (event === "TOKEN_REFRESHED") return;

        void resolveDomainSession(connection, session, `onAuthStateChange:${event}`)
          .then(listener)
          .catch(() => {
            logger.warn("Session change could not be resolved", { module: "auth" });
            listener(null);
          });
      });

      return () => data.subscription.unsubscribe();
    },
  };
}
