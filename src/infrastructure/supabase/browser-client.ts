/**
 * Browser Supabase client — Sprint 1.1 §2.
 *
 * Lazily constructed: importing this module must never create a client or touch
 * `localStorage`, because the module is evaluated during SSR too. Returns `null`
 * when the project is not configured; callers report unavailability rather than
 * crashing the shell (Sprint 1.1 ships no provisioned project).
 *
 * Contains no authentication logic — it only exposes the configured client.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appConfig } from "@/config";

import type { ConnectionStatus, Database } from "./supabase.types";

let client: SupabaseClient<Database> | null = null;

export function getBrowserSupabaseClient(): SupabaseClient<Database> | null {
  if (client) return client;

  const { endpointUrl, publicKey, isConfigured } = appConfig.persistence;
  if (!isConfigured || !endpointUrl || !publicKey) return null;

  client = createClient<Database>(endpointUrl, publicKey, {
    auth: {
      // Session handling belongs to the auth module (Sprint 1.2). The transport
      // defaults are declared here so that module changes no options.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: { "x-client-info": `streamflow/${appConfig.environment}` },
    },
  });
  return client;
}

export function getBrowserConnectionStatus(): ConnectionStatus {
  const { endpointUrl, isConfigured } = appConfig.persistence;
  return {
    isConfigured,
    scope: "browser",
    driver: "postgres",
    host: endpointUrl ? new URL(endpointUrl).host : null,
  };
}

/** Test-support only: drops the memoized client. */
export function resetBrowserSupabaseClient(): void {
  client = null;
}
