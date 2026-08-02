/**
 * Persistence adapter selection — Sprint 1.3 §1/§6.
 *
 * This module is the seam between the application and whichever storage engine
 * is deployed. It re-exports the ACTIVE adapter under neutral names, so moving
 * to user-owned PostgreSQL, Neon, Railway, Docker Postgres, or SQLite is a
 * change to this file plus one sibling adapter folder — nothing above
 * Infrastructure moves (Project Infrastructure Policy).
 *
 * Deliberately NOT re-exported: generated schema types, driver client types,
 * and query builders. Those stay inside the adapter folder.
 */
import {
  createBrowserDataConnection,
  createDataConnection,
  getBrowserDataConnection,
  type DataConnection,
} from "../supabase/connection";
import { SUPABASE_ADAPTER } from "../supabase/supabase.types";

import type { PersistenceAdapterDescriptor, PersistenceConnection } from "@/repository";

/** The adapter compiled into this build. Diagnostics only — never branch on it. */
export const ACTIVE_PERSISTENCE_ADAPTER: PersistenceAdapterDescriptor = SUPABASE_ADAPTER;

/**
 * Shared browser-scope connection, typed as the neutral contract.
 *
 * Repositories inside Infrastructure may narrow to the adapter connection;
 * anything above receives availability and status only.
 */
export function getPersistenceConnection(): PersistenceConnection {
  return getBrowserDataConnection();
}

/** Adapter-typed accessors, for Infrastructure-internal use only. */
export {
  createBrowserDataConnection,
  createDataConnection,
  getBrowserDataConnection,
  type DataConnection,
};
