/**
 * Server Supabase clients — Sprint 1.1 §2.
 *
 * `.server.ts` keeps this module out of every client bundle. Both factories
 * read the environment lazily, inside the call, because edge runtimes inject
 * env per request.
 *
 * Neither client persists a session: a server request is stateless, and a
 * persisted session on a shared worker would leak between callers.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readServerEnv } from "@/config/server-env.server";
import { AppError, SYSTEM_ERRORS } from "@/shared/constants/error-taxonomy";

import type { ConnectionStatus, Database } from "./supabase.types";

const STATELESS_AUTH = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

/**
 * Publishable-key client for server-side reads of data that is public by
 * policy. Row-level security still applies, as the anonymous role.
 */
export function createServerSupabaseClient(): SupabaseClient<Database> {
  const environment = readServerEnv();
  const url = environment.SUPABASE_URL;
  const key = environment.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new AppError(SYSTEM_ERRORS.CONFIG_INVALID, {
      cause: new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required"),
    });
  }
  return createClient<Database>(url, key, { auth: STATELESS_AUTH });
}

/**
 * Service-role client. Bypasses row-level security, so it is reserved for
 * privileged maintenance work and must never be reachable from a route module's
 * import graph — load it with `await import()` inside a handler.
 */
export function createServiceSupabaseClient(): SupabaseClient<Database> {
  const environment = readServerEnv();
  const url = environment.SUPABASE_URL;
  const key = environment.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new AppError(SYSTEM_ERRORS.CONFIG_INVALID, {
      cause: new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"),
    });
  }
  return createClient<Database>(url, key, { auth: STATELESS_AUTH });
}

export function getServerConnectionStatus(): ConnectionStatus {
  const environment = readServerEnv();
  const url = environment.SUPABASE_URL ?? null;
  return {
    isConfigured: Boolean(url && environment.SUPABASE_PUBLISHABLE_KEY),
    scope: "server",
    host: url ? new URL(url).host : null,
  };
}
