/**
 * PostgREST error translation — Sprint 1.1 §2.
 *
 * The single place a vendor error becomes a `RepositoryError`. Codes are
 * PostgreSQL SQLSTATE values plus PostgREST's own `PGRST*` family.
 */
import type { PostgrestError } from "@supabase/supabase-js";

import {
  REPOSITORY_ERRORS,
  RepositoryError,
  type RepositoryErrorContext,
} from "@/repository";
import type { AppErrorDescriptor } from "@/shared/constants/error-taxonomy";

function descriptorFor(code: string | undefined): AppErrorDescriptor {
  switch (code) {
    case "PGRST116": // no rows returned for a single-row request
      return REPOSITORY_ERRORS.NOT_FOUND;
    case "23505": // unique_violation
      return REPOSITORY_ERRORS.CONFLICT;
    case "23503": // foreign_key_violation
    case "23514": // check_violation
    case "23502": // not_null_violation
      return REPOSITORY_ERRORS.CONSTRAINT_VIOLATION;
    case "42501": // insufficient_privilege — row-level security refusal
    case "PGRST301":
      return REPOSITORY_ERRORS.PERMISSION_DENIED;
    default:
      return REPOSITORY_ERRORS.QUERY_FAILED;
  }
}

/**
 * Never forwards the vendor message: it can echo row contents and column names.
 * The original is preserved as `cause` for server-side logs only.
 */
export function toRepositoryError(
  error: PostgrestError,
  context: RepositoryErrorContext,
): RepositoryError {
  return new RepositoryError(descriptorFor(error.code), context, { cause: error });
}

export function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof RepositoryError && error.code === REPOSITORY_ERRORS.NOT_FOUND.code
  );
}
