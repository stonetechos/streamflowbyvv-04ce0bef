/**
 * Database type surface — Sprint 1.1 §2.
 *
 * Sprint 1.1 ships NO migrations, so no generated schema types exist yet
 * (Build Rules §1: build only this sprint). `Database` is therefore an open
 * placeholder that generated types will replace verbatim in the sprint that
 * introduces the schema — every wrapper below is already generic over it, so
 * that replacement is a one-line change with no call-site churn.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Database = any;

export interface SupabaseConnectionConfig {
  readonly url: string;
  readonly key: string;
  /** Whether the client persists and refreshes a session (browser only). */
  readonly persistSession: boolean;
  readonly headers?: Readonly<Record<string, string>>;
}

/** Reported by every connection so callers can degrade instead of throwing. */
export interface ConnectionStatus {
  readonly isConfigured: boolean;
  readonly scope: SupabaseClientScope;
  /** Host only — the key is never exposed, logged, or serialized. */
  readonly host: string | null;
}

export type SupabaseClientScope = "browser" | "server" | "service";
