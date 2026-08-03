/**
 * Provider catalog adapter selection — Sprint 2.2.
 *
 * The composition root imports THIS module, never the vendor folder. Moving
 * the catalog to a static bundle, a CDN document, or another database is a
 * change to this file plus one sibling adapter folder.
 */
import { PROVIDER_LAUNCHER } from "@/domain";
import { bindService, isServiceBound } from "@/domain/service-registry";

import { createBrowserProviderLauncher } from "./browser-provider-launcher";
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

/**
 * Binds catalog and preference contracts, plus the Sprint 2.8 launch port.
 *
 * The launcher is bound unconditionally: opening a public address needs no
 * backend, so a room can still hand members off to their provider even when
 * the catalog store is unreachable.
 */
export function registerProviderAdapter(): boolean {
  if (!isServiceBound(PROVIDER_LAUNCHER)) {
    const launcher = createBrowserProviderLauncher();
    bindService(PROVIDER_LAUNCHER, () => launcher);
  }
  return registerSupabaseProviderAdapter();
}

export { createBrowserProviderLauncher } from "./browser-provider-launcher";
