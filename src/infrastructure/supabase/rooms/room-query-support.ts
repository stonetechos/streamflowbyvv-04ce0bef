/**
 * Shared query support for the room cluster adapters — Sprint 1.7.
 *
 * Paging, sorting, soft-delete filtering, and availability guarding, factored
 * out so the four adapters repeat none of it. Vendor-only: the builder type
 * never leaves Infrastructure.
 */
import { REPOSITORY_ERRORS, RepositoryError, type RepositoryErrorContext } from "@/repository";
import type { Page, QuerySpec } from "@/repository/repository.types";

import type { DataConnection } from "../connection";
import { runCountedQuery } from "../query-wrapper";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** Fails fast when the backend is not configured, before a query is attempted. */
export function requireAvailable(
  connection: DataConnection,
  context: RepositoryErrorContext,
): void {
  if (!connection.isAvailable()) {
    throw new RepositoryError(REPOSITORY_ERRORS.UNAVAILABLE, context);
  }
}

/** Clamps caller-supplied paging so one request cannot scan a whole table. */
export function resolvePage(spec: QuerySpec<unknown> | undefined): {
  limit: number;
  offset: number;
} {
  const limit = Math.min(MAX_LIMIT, Math.max(1, spec?.page?.limit ?? DEFAULT_LIMIT));
  const offset = Math.max(0, spec?.page?.offset ?? 0);
  return { limit, offset };
}

export interface PaginateOptions<TRow, TEntity> {
  /** Counted PostgREST builder; the type is vendor-specific and stays here. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly builder: any;
  readonly query: QuerySpec<TEntity> | undefined;
  readonly toEntity: (row: TRow) => TEntity;
  readonly softDeleteColumn?: string;
  readonly context: RepositoryErrorContext;
  /** Maps a domain sort field to its column. Unmapped fields are ignored. */
  readonly sortColumns?: Readonly<Record<string, string>>;
}

/** Applies filters and range, then maps rows to domain entities. */
export async function paginateRows<TRow, TEntity>(
  options: PaginateOptions<TRow, TEntity>,
): Promise<Page<TEntity>> {
  const { limit, offset } = resolvePage(options.query as QuerySpec<unknown> | undefined);
  let builder = options.builder;

  if (options.softDeleteColumn && !options.query?.includeDeleted) {
    builder = builder.is(options.softDeleteColumn, null);
  }
  for (const sort of options.query?.sort ?? []) {
    const column = options.sortColumns?.[sort.field] ?? toSnakeCase(sort.field);
    builder = builder.order(column, { ascending: sort.direction === "asc" });
  }
  builder = builder.range(offset, offset + limit - 1);

  const { rows, total } = await runCountedQuery<TRow>(builder, options.context);
  return {
    items: rows.map(options.toEntity),
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  };
}

/** Domain fields are camelCase; columns are snake_case (Database Spec §4). */
function toSnakeCase(field: string): string {
  return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
