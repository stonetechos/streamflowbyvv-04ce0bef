/**
 * Database type surface — Sprint 1.2 §5.
 *
 * The Sprint 1.1 `any` placeholder is replaced by the generated schema types.
 * Generation output is owned by the Cloud integration
 * (`@/integrations/supabase/types`); infrastructure re-exports it so that the
 * repository layer depends on this vendor-neutral module path only.
 */

export type { Json } from "@/integrations/supabase/types";
import type { Database as GeneratedDatabase } from "@/integrations/supabase/types";

export type Database = GeneratedDatabase;

/** Convenience aliases for repository mapping (Sprint 1.2 §6). */
export type PublicSchema = Database["public"];
export type Tables = PublicSchema["Tables"];
export type TableName = keyof Tables & string;
export type TableRow<T extends TableName> = Tables[T]["Row"];
export type TableInsert<T extends TableName> = Tables[T]["Insert"];
export type TableUpdate<T extends TableName> = Tables[T]["Update"];

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
