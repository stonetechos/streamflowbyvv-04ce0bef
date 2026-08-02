/**
 * Repository contracts — Sprint 1.1 §3, Foundation §5.
 *
 * Declared in Domain terms and free of any vendor type. Sprint 1.1 defines the
 * shapes only; no aggregate repository exists yet, because no aggregate does
 * (Build Rules §1).
 */

/** Every aggregate root is identified by a UUID (Foundation §11). */
export type EntityId = string;

/** Human-readable display code, e.g. `ROM-000001`. Never a primary key. */
export type EntityCode = string;

export interface Page<TEntity> {
  readonly items: readonly TEntity[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

export interface PageRequest {
  readonly limit: number;
  readonly offset: number;
}

export type SortDirection = "asc" | "desc";

export interface SortSpec<TEntity> {
  readonly field: keyof TEntity & string;
  readonly direction: SortDirection;
}

export interface QuerySpec<TEntity> {
  readonly page?: PageRequest;
  readonly sort?: readonly SortSpec<TEntity>[];
  /** Excluded by default wherever an aggregate supports soft deletion. */
  readonly includeDeleted?: boolean;
}

export interface ReadRepository<TEntity, TId = EntityId> {
  findById(id: TId): Promise<TEntity | null>;
  exists(id: TId): Promise<boolean>;
  list(spec?: QuerySpec<TEntity>): Promise<Page<TEntity>>;
}

export interface WriteRepository<TEntity, TId = EntityId, TCreate = TEntity> {
  create(input: TCreate): Promise<TEntity>;
  update(id: TId, changes: Partial<TEntity>): Promise<TEntity>;
  /** Soft delete where the aggregate supports it (Database Spec §4). */
  remove(id: TId): Promise<void>;
}

export interface Repository<TEntity, TId = EntityId, TCreate = TEntity>
  extends ReadRepository<TEntity, TId>,
    WriteRepository<TEntity, TId, TCreate> {}

/** Maps a persistence row to a domain entity. The only place row shape is known. */
export interface RowMapper<TRow, TEntity> {
  toEntity(row: TRow): TEntity;
  toRow(entity: Partial<TEntity>): Partial<TRow>;
}

/**
 * Groups writes that must succeed or fail together. Implementations decide the
 * mechanism (transaction, RPC); callers only see atomicity.
 */
export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}
