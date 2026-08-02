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
  ACTIVITY_TIMELINE_PROJECTION,
  ACTIVITY_TYPES,
  ANALYTICS_EVENT_SINK,
  EVENT_STORE_REPOSITORY,
  REALTIME_EVENT_PUBLISHER,
  RECENT_PARTNERS_PROJECTION,
  type ActivityTimelineEntry,
  type ActivityTimelineProjection,
  type ActivityType,
  type AnalyticsEventRecord,
  type AnalyticsEventSinkRepository,
  type EventAppendResult,
  type EventPayloadRecord,
  type EventStoreRepository,
  type PartnerObservation,
  type RealtimeEventPublisher,
  type RecentPartnersProjection,
  type StoredDomainEvent,
} from "./events";
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
  CODE_ALLOCATOR,
  CODE_PREFIXES,
  ROOM_UNIT_OF_WORK,
  type CodeAllocator,
  type CodePrefix,
  type RoomUnitOfWork,
} from "./rooms/room-support.types";
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
