/**
 * Identity adapter selection — Sprint 1.5 §8, mirroring the Sprint 1.3
 * persistence seam.
 *
 * The seam between the application and whichever identity provider is
 * deployed. The composition root imports THIS module; swapping Supabase Auth
 * for Keycloak, Auth0, Clerk, or a self-hosted GoTrue is a change to this file
 * plus one sibling adapter folder — nothing above Infrastructure moves.
 *
 * No vendor type, client, or credential is re-exported here.
 */
import { registerSupabaseAuthAdapter } from "../supabase/auth";

/** Describes the compiled-in identity adapter. Diagnostics only — never branch on it. */
export interface IdentityAdapterDescriptor {
  readonly id: string;
  /** Provider-issued session material stays inside the adapter. */
  readonly holdsCredentials: false;
}

export const ACTIVE_IDENTITY_ADAPTER: IdentityAdapterDescriptor = Object.freeze({
  id: "supabase-auth",
  holdsCredentials: false,
});

/**
 * Binds the authentication repository contracts to the active adapter.
 * Idempotent, and a no-op when the backend is not configured: the application
 * must boot and report unavailability rather than fail.
 */
export function registerIdentityAdapter(): boolean {
  return registerSupabaseAuthAdapter();
}
