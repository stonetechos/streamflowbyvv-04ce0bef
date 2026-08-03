/**
 * Vendor-neutral persistence contracts — Sprint 1.3 §1.
 *
 * Foundation §5: Domain, Feature, and Presentation depend on the Repository
 * layer only. These types describe what a persistence adapter must provide
 * WITHOUT naming a vendor, so the same contracts hold for user-owned
 * PostgreSQL, Neon, Railway, Docker Postgres, SQLite, or any future driver.
 * The Sprint 1.2 Supabase implementation is one adapter, not the contract.
 *
 * Nothing in this module may import a driver, a client library, or generated
 * schema types.
 */

/**
 * Storage engine behind an adapter. Purely informational: no caller may branch
 * on it to change domain behaviour (Build Rules §2 — vendor neutrality).
 */
export type PersistenceDriverKind = "postgres" | "sqlite" | "memory" | "remote-api";

/** Execution scope of a connection. Determines credential class, not behaviour. */
export type PersistenceScope = "browser" | "server" | "service";

/**
 * Reported by every connection so callers can degrade instead of throwing.
 * Never carries a key, token, or connection string — host only.
 */
export interface PersistenceConnectionStatus {
  readonly isConfigured: boolean;
  readonly scope: PersistenceScope;
  readonly driver: PersistenceDriverKind;
  /** Host component only. Credentials are never exposed or serialized. */
  readonly host: string | null;
}

/**
 * The upward-facing shape of a persistence connection. Adapters extend this
 * with a driver-specific accessor that stays inside Infrastructure; layers
 * above see only availability and status.
 */
export interface PersistenceConnection {
  readonly status: PersistenceConnectionStatus;
  /** True when a query can be attempted without throwing. */
  isAvailable(): boolean;
}

/**
 * A stored record as the Repository layer is allowed to see it: an opaque bag
 * of columns. Concrete row shapes live in Infrastructure and are converted by
 * a mapper before crossing this boundary (Sprint 1.3 §2).
 */
export type PersistenceRecord = Record<string, unknown>;

/**
 * Authorization is a Domain concern (Sprint 1.3 §5). Storage-level enforcement
 * — row level security, grants, database roles — is an adapter capability that
 * may or may not exist; no Feature or Domain code may assume it does. Adapters
 * declare what they enforce so Infrastructure can log or fail closed.
 */
export interface PersistenceSecurityCapabilities {
  /** Adapter enforces per-row access rules in the storage engine itself. */
  readonly enforcesRowLevelSecurity: boolean;
  /** Adapter scopes requests to an authenticated principal. */
  readonly enforcesPrincipalScoping: boolean;
}

/** Describes an adapter without exposing it. Used for diagnostics and tests. */
export interface PersistenceAdapterDescriptor {
  /** Stable adapter identifier, e.g. `postgres-supabase`, `postgres-node`. */
  readonly id: string;
  readonly driver: PersistenceDriverKind;
  readonly security: PersistenceSecurityCapabilities;
}
