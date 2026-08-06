/**
 * Backend fixtures — M0 Remediation WP2.
 *
 * Provides a raw Data-API client for certification. Tests use it to observe
 * server authority and RLS behaviour directly, independent of the UI.
 * Reads the project's publishable key only; no privileged key is ever used,
 * because certification must prove what a real client can and cannot do.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function loadEnvFile(): Record<string, string> {
  if (!existsSync(".env")) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) out[match[1]!] = match[2]!.replace(/^["']|["']$/g, "");
  }
  return out;
}

const fileEnv = loadEnvFile();

export const SUPABASE_URL = process.env["VITE_SUPABASE_URL"] ?? fileEnv["VITE_SUPABASE_URL"] ?? "";
export const SUPABASE_KEY =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? fileEnv["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";

export const backendConfigured = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface CertIdentity {
  readonly email: string;
  readonly password: string;
  readonly userId: string;
  readonly client: SupabaseClient;
}

/**
 * Provision an ephemeral identity. Returns null when sign-up is not available
 * in this environment (closed sign-ups, email confirmation required) — the
 * caller must then record the row as `unmeasured`, never as a pass.
 */
export async function provisionIdentity(label: string): Promise<CertIdentity | null> {
  if (!backendConfigured) return null;
  const client = anonClient();
  const email = `cert+${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@streamflow-cert.test`;
  const password = `Cert!${Math.random().toString(36).slice(2, 12)}Aa1`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error || !data.session || !data.user) return null;
  return { email, password, userId: data.user.id, client };
}

export async function profileIdFor(identity: CertIdentity): Promise<string | null> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data } = await identity.client
      .from("profiles")
      .select("id")
      .eq("auth_user_id", identity.userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (data?.["id"]) return data["id"] as string;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return null;
}

/** Create a room the way the app does: server-allocated code, host = caller. */
export async function createCertRoom(
  host: CertIdentity,
  hostProfileId: string,
  name = "Certification room",
): Promise<{ id: string; code: string } | null> {
  const { data: code } = await host.client.rpc("allocate_code", { _prefix: "ROM" });
  if (!code) return null;
  const { data } = await host.client
    .from("rooms")
    .insert({
      code,
      name,
      host_profile_id: hostProfileId,
      status: "lobby",
      max_members: 4,
    })
    .select("id, code")
    .maybeSingle();
  if (!data) return null;
  return { id: data["id"] as string, code: data["code"] as string };
}
