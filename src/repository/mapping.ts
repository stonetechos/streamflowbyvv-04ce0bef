/**
 * Entity mapping — Sprint 1.3 §2.
 *
 * A persistence record must never reach Domain. Every repository converts
 * records to entities through a mapper defined here, so the row shape stays
 * behind the Repository boundary and an adapter swap cannot ripple upward.
 *
 * Mappers are pure functions: no I/O, no validation side effects, no logging.
 */
import type { Page } from "./repository.types";
import type { PersistenceRecord } from "./persistence.types";

/**
 * Bidirectional conversion between a stored record and a domain entity.
 *
 * `toRecord` is partial because updates carry only changed fields; adapters
 * are responsible for rejecting unknown columns.
 */
export interface EntityMapper<TRecord extends PersistenceRecord, TEntity> {
  toEntity(record: TRecord): TEntity;
  toRecord(entity: Partial<TEntity>): Partial<TRecord>;
}

/** Declares a mapper with inference, keeping repository modules terse. */
export function defineMapper<TRecord extends PersistenceRecord, TEntity>(
  mapper: EntityMapper<TRecord, TEntity>,
): EntityMapper<TRecord, TEntity> {
  return mapper;
}

/** Maps a batch of records. Order is preserved. */
export function mapRecords<TRecord extends PersistenceRecord, TEntity>(
  mapper: EntityMapper<TRecord, TEntity>,
  records: readonly TRecord[],
): TEntity[] {
  return records.map((record) => mapper.toEntity(record));
}

/** Maps a page of records without altering its paging metadata. */
export function mapPage<TRecord extends PersistenceRecord, TEntity>(
  mapper: EntityMapper<TRecord, TEntity>,
  page: Page<TRecord>,
): Page<TEntity> {
  return {
    items: mapRecords(mapper, page.items),
    total: page.total,
    limit: page.limit,
    offset: page.offset,
    hasMore: page.hasMore,
  };
}

/**
 * Builds a mapper from two plain functions. Equivalent to `defineMapper`, but
 * reads better when the conversions already exist as named helpers.
 */
export function createEntityMapper<TRecord extends PersistenceRecord, TEntity>(
  toEntity: (record: TRecord) => TEntity,
  toRecord: (entity: Partial<TEntity>) => Partial<TRecord>,
): EntityMapper<TRecord, TEntity> {
  return { toEntity, toRecord };
}
