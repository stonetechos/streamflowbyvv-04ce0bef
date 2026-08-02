/**
 * Connection abstraction — Sprint 1.1 §2.
 *
 * Everything that touches the database goes through a `DataConnection`, so the
 * vendor client is reachable from exactly one place per scope. Swapping the
 * database is an Infrastructure change (Foundation §5).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { REPOSITORY_ERRORS, RepositoryError, type PersistenceConnection } from "@/repository";

import { getBrowserConnectionStatus, getBrowserSupabaseClient } from "./browser-client";
import type { ConnectionStatus, Database } from "./supabase.types";

/**
 * Adapter-side connection. It satisfies the neutral `PersistenceConnection`
 * contract and adds the driver client, which never leaves Infrastructure
 * (Sprint 1.3 §1).
 */
export interface DataConnection extends PersistenceConnection {
  readonly status: ConnectionStatus;
  /** Throws `SF-SYS-PERSISTENCE-UNAVAILABLE` when not configured. */
  client(): SupabaseClient<Database>;
}

export function createBrowserDataConnection(): DataConnection {
  return {
    get status() {
      return getBrowserConnectionStatus();
    },
    isAvailable: () => getBrowserSupabaseClient() !== null,
    client: () => {
      const client = getBrowserSupabaseClient();
      if (!client) {
        throw new RepositoryError(REPOSITORY_ERRORS.UNAVAILABLE, {
          aggregate: "connection",
          operation: "client",
        });
      }
      return client;
    },
  };
}

/** Wraps an already-constructed client (server scope, or a test double). */
export function createDataConnection(
  client: SupabaseClient<Database>,
  status: ConnectionStatus,
): DataConnection {
  return { status, isAvailable: () => true, client: () => client };
}

let browserConnection: DataConnection | null = null;

/** Shared browser-scope connection. Server scopes build their own per request. */
export function getBrowserDataConnection(): DataConnection {
  browserConnection ??= createBrowserDataConnection();
  return browserConnection;
}
