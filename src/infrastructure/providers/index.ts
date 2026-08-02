/**
 * Provider catalog adapter selection — Sprint 2.2.
 *
 * The composition root imports THIS module, never the vendor folder. Moving
 * the catalog to a static bundle, a CDN document, or another database is a
 * change to this file plus one sibling adapter folder.
 */
import { registerSupabaseProviderAdapter } from "../supabase/providers";

export interface ProviderAdapterDescriptor {
  readonly id: string;
  /** The catalog is curated upstream; the application never writes it. */
  readonly isCatalogReadOnly: true;
}

export const ACTIVE_PROVIDER_ADAPTER: ProviderAdapterDescriptor = Object.freeze({
  id: "postgres-supabase",
  isCatalogReadOnly: true,
});

/** Binds catalog and preference contracts. No-op when unconfigured. */
export function registerProviderAdapter(): boolean {
  return registerSupabaseProviderAdapter();
}
