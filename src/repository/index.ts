/**
 * Repository layer public surface.
 *
 * Sprint 1.3 §1/§6: everything exported here is vendor-neutral. No generated
 * schema type, driver type, or client type may appear in this barrel — layers
 * above import from here and must stay portable.
 */
export {
  AUTH_IDENTITY_REPOSITORY,
  AUTH_REPOSITORY,
  ROLE_REPOSITORY,
  SESSION_REPOSITORY,
  type AuthIdentityRepository,
  type AuthRepository,
  type RoleRepository,
  type SessionRepository,
} from "./auth";
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
  INVITE_REPOSITORY,
  ROOM_MEMBER_REPOSITORY,
  ROOM_REPOSITORY,
  ROOM_STATE_REPOSITORY,
  type InviteQuery,
  type InviteRepository,
  type RoomMemberQuery,
  type RoomMemberRepository,
  type RoomQuery,
  type RoomRepository,
  type RoomStateConcurrencyInfo,
  type RoomStateRepository,
} from "./rooms";
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
