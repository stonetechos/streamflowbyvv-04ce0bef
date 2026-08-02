/**
 * Typed query wrappers — Sprint 1.1 §2.
 *
 * Supabase returns `{ data, error }` and never rejects. These wrappers collapse
 * that into a value-or-throw contract with translated errors, so no repository
 * repeats error handling and no `PostgrestError` escapes Infrastructure.
 */
import type { PostgrestError } from "@supabase/supabase-js";

import { REPOSITORY_ERRORS, RepositoryError, type RepositoryErrorContext } from "@/repository";

import { toRepositoryError } from "./error-mapping";

export interface PostgrestLike<T> {
  data: T | null;
  error: PostgrestError | null;
  count?: number | null;
}

/** Resolves a query that must return data; throws on error or absent data. */
export async function runQuery<T>(
  query: PromiseLike<PostgrestLike<T>>,
  context: RepositoryErrorContext,
): Promise<T> {
  const { data, error } = await query;
  if (error) throw toRepositoryError(error, context);
  if (data === null) {
    throw new RepositoryError(REPOSITORY_ERRORS.NOT_FOUND, context);
  }
  return data;
}

/** Resolves a query where "no row" is a legitimate outcome. */
export async function runMaybe<T>(
  query: PromiseLike<PostgrestLike<T>>,
  context: RepositoryErrorContext,
): Promise<T | null> {
  const { data, error } = await query;
  if (error) {
    const mapped = toRepositoryError(error, context);
    if (mapped.code === REPOSITORY_ERRORS.NOT_FOUND.code) return null;
    throw mapped;
  }
  return data;
}

/** Resolves a query executed for its effect only. */
export async function runCommand(
  query: PromiseLike<PostgrestLike<unknown>>,
  context: RepositoryErrorContext,
): Promise<void> {
  const { error } = await query;
  if (error) throw toRepositoryError(error, context);
}

/** Resolves a counted list query into rows plus the total reported by the server. */
export async function runCountedQuery<T>(
  query: PromiseLike<PostgrestLike<T[]>>,
  context: RepositoryErrorContext,
): Promise<{ rows: T[]; total: number }> {
  const { data, error, count } = await query;
  if (error) throw toRepositoryError(error, context);
  const rows = data ?? [];
  return { rows, total: count ?? rows.length };
}
