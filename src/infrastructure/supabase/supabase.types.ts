/**
 * Database type surface — Sprint 1.2 §5.
 *
 * The Sprint 1.1 `any` placeholder is replaced by the generated schema types.
 * Generation output is owned by the Cloud integration
 * (`@/integrations/supabase/types`); infrastructure re-exports it so that the
 * repository layer depends on this vendor-neutral module path only.
 */

import type {
  PersistenceAdapterDescriptor,
  PersistenceConnectionStatus,
  PersistenceScope,
} from "@/repository";

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

/**
 * Connection status is the neutral Repository shape (Sprint 1.3 §1); the alias
 * exists so adapter code keeps its local vocabulary without redefining it.
 */
export type ConnectionStatus = PersistenceConnectionStatus;
export type SupabaseClientScope = PersistenceScope;

/** Descriptor published by this adapter (Sprint 1.3 §5). */
export const SUPABASE_ADAPTER: PersistenceAdapterDescriptor = Object.freeze({
  id: "postgres-supabase",
  driver: "postgres",
  security: Object.freeze({
    enforcesRowLevelSecurity: true,
    enforcesPrincipalScoping: true,
  }),
});
