/**
 * Repository layer public surface.
 *
 * Sprint 1.3 §1/§6: everything exported here is vendor-neutral. No generated
 * schema type, driver type, or client type may appear in this barrel — layers
 * above import from here and must stay portable.
 */
export {
  createEntityMapper,
  defineMapper,
  mapPage,
  mapRecords,
  type EntityMapper,
} from "./mapping";
export type {
  PersistenceAdapterDescriptor,
  PersistenceConnection,
  PersistenceConnectionStatus,
  PersistenceDriverKind,
  PersistenceRecord,
  PersistenceScope,
  PersistenceSecurityCapabilities,
} from "./persistence.types";
export {
  REPOSITORY_ERRORS,
  RepositoryError,
  type RepositoryErrorContext,
} from "./repository-error";
export {
  bindRepository,
  createRepositoryToken,
  isRepositoryBound,
  resetRepositoryRegistry,
  resolveRepository,
  type RepositoryToken,
} from "./repository-registry";
export type {
  EntityCode,
  EntityId,
  Page,
  PageRequest,
  QuerySpec,
  ReadRepository,
  Repository,
  RowMapper,
  SortDirection,
  SortSpec,
  UnitOfWork,
  WriteRepository,
} from "./repository.types";
