/**
 * Supabase infrastructure public surface.
 *
 * `server-client.server.ts` is NOT re-exported: server-only code must be
 * imported directly from inside a server handler so it never reaches a client
 * bundle.
 */
export {
  getBrowserConnectionStatus,
  getBrowserSupabaseClient,
  resetBrowserSupabaseClient,
} from "./browser-client";
export {
  createBrowserDataConnection,
  createDataConnection,
  getBrowserDataConnection,
  type DataConnection,
} from "./connection";
export { isNotFoundError, toRepositoryError } from "./error-mapping";
export {
  runCommand,
  runCountedQuery,
  runMaybe,
  runQuery,
  type PostgrestLike,
} from "./query-wrapper";
export {
  SupabaseRepositoryBase,
  type SupabaseRepositoryOptions,
} from "./supabase-repository";
export type {
  ConnectionStatus,
  Database,
  Json,
  PublicSchema,
  SupabaseClientScope,
  SupabaseConnectionConfig,
  TableInsert,
  TableName,
  TableRow,
  Tables,
  TableUpdate,
} from "./supabase.types";

