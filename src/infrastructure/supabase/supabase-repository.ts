/**
 * Repository infrastructure — Sprint 1.1 §3.
 *
 * Generic plumbing shared by every future aggregate repository: table access,
 * paging, sorting, soft-delete filtering, and error translation. It contains NO
 * business rules and knows no aggregate; concrete repositories ship with their
 * own module in later sprints (Build Rules §1).
 */
import type { Page, QuerySpec, RowMapper } from "@/repository";
import { REPOSITORY_ERRORS, RepositoryError } from "@/repository";

import type { DataConnection } from "./connection";
import { runCountedQuery } from "./query-wrapper";

export interface SupabaseRepositoryOptions<TRow, TEntity> {
  readonly connection: DataConnection;
  /** Physical table name. The only place it is ever written. */
  readonly table: string;
  /** Aggregate name used in errors and logs — domain terms, not table terms. */
  readonly aggregate: string;
  readonly mapper: RowMapper<TRow, TEntity>;
  /** Column holding the soft-delete timestamp, when the aggregate has one. */
  readonly softDeleteColumn?: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Base for Supabase-backed repositories. Subclasses expose aggregate-specific
 * reads and writes; they never re-implement paging or error handling.
 */
export abstract class SupabaseRepositoryBase<TRow extends Record<string, unknown>, TEntity> {
  protected constructor(
    protected readonly options: SupabaseRepositoryOptions<TRow, TEntity>,
  ) {}

  /** Query builder for this repository's table. */
  protected table() {
    return this.options.connection.client().from(this.options.table);
  }

  protected context(operation: string, entityId?: string) {
    return {
      aggregate: this.options.aggregate,
      operation,
      ...(entityId ? { entityId } : {}),
    };
  }

  protected toEntity(row: TRow): TEntity {
    return this.options.mapper.toEntity(row);
  }

  /** Clamps caller-supplied paging so one request cannot scan a whole table. */
  protected resolvePage(spec: QuerySpec<TEntity> | undefined) {
    const limit = Math.min(MAX_LIMIT, Math.max(1, spec?.page?.limit ?? DEFAULT_LIMIT));
    const offset = Math.max(0, spec?.page?.offset ?? 0);
    return { limit, offset };
  }

  /**
   * Applies sorting, soft-delete filtering, and range to a counted query, then
   * maps the rows. `query` must already select with `{ count: "exact" }`.
   */
  protected async paginate(
    // The builder type is vendor-specific and intentionally not surfaced.
    query: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    spec: QuerySpec<TEntity> | undefined,
    operation: string,
  ): Promise<Page<TEntity>> {
    const { limit, offset } = this.resolvePage(spec);
    let builder = query;

    if (this.options.softDeleteColumn && !spec?.includeDeleted) {
      builder = builder.is(this.options.softDeleteColumn, null);
    }
    for (const sort of spec?.sort ?? []) {
      builder = builder.order(sort.field, { ascending: sort.direction === "asc" });
    }
    builder = builder.range(offset, offset + limit - 1);

    const { rows, total } = await runCountedQuery<TRow>(builder, this.context(operation));
    return {
      items: rows.map((row) => this.toEntity(row)),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  /** Guards a write against an unconfigured connection before it is attempted. */
  protected assertAvailable(operation: string): void {
    if (!this.options.connection.isAvailable()) {
      throw new RepositoryError(REPOSITORY_ERRORS.UNAVAILABLE, this.context(operation));
    }
  }
}
