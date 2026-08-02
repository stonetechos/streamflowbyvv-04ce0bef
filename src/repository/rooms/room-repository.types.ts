/**
 * Room persistence contracts — Sprint 1.7, Foundation §5.
 *
 * Expressed entirely in Domain terms. An Infrastructure adapter (Supabase,
 * user-owned PostgreSQL, SQLite, remote API) implements them; swapping the
 * store is an Infrastructure-only change (Build Rules §25).
 *
 * No table name, column name, driver type, or query builder appears here.
 * Business rules — capacity, lifecycle transitions, invite expiry — belong to
 * the Sprint 1.6 domain services and are deliberately absent (Build Rules §1).
 */
import type {
  Invite,
  InviteDraft,
  InvitePatch,
  Room,
  RoomDraft,
  RoomMember,
  RoomMemberDraft,
  RoomMemberPatch,
  RoomPatch,
  RoomState,
  RoomStateDraft,
  RoomStatePatch,
} from "@/domain/rooms/room.types";
import type { InviteStatus, MembershipState, RoomStatus } from "@/domain/shared/domain-enums";
import { createRepositoryToken, type RepositoryToken } from "@/repository/repository-registry";
import type { EntityCode, EntityId, Page, QuerySpec } from "@/repository/repository.types";

/** Filters a room listing. Every field is optional and ANDed. */
export interface RoomQuery extends QuerySpec<Room> {
  readonly hostProfileId?: EntityId;
  readonly statuses?: readonly RoomStatus[];
  /** Rooms the given profile is invited to or joined in. */
  readonly memberProfileId?: EntityId;
}

export interface RoomMemberQuery extends QuerySpec<RoomMember> {
  readonly states?: readonly MembershipState[];
}

export interface InviteQuery extends QuerySpec<Invite> {
  readonly statuses?: readonly InviteStatus[];
}

/**
 * Room aggregate root persistence.
 * `remove` is a soft delete (Database Spec §4); rows are never destroyed here.
 */
export interface RoomRepository {
  findById(id: EntityId): Promise<Room | null>;
  findByCode(code: EntityCode): Promise<Room | null>;
  list(query?: RoomQuery): Promise<Page<Room>>;
  create(draft: RoomDraft): Promise<Room>;
  update(id: EntityId, patch: RoomPatch): Promise<Room>;
  remove(id: EntityId): Promise<void>;
}

/**
 * Raised when a `room_state` write states a version the store no longer holds.
 * Carries the observed version so the caller can re-read and retry.
 */
export interface RoomStateConcurrencyInfo {
  readonly roomId: EntityId;
  readonly expectedVersion: number;
  readonly actualVersion: number | null;
}

/**
 * Authoritative playback state, guarded by optimistic concurrency
 * (Database Spec §3.2 `room_state.version`, ADR-004).
 *
 * Every mutation names the version it read. A stale write never wins silently:
 * the adapter raises `SF-SYS-CONFLICT` and leaves the stored row untouched.
 */
export interface RoomStateRepository {
  findByRoomId(roomId: EntityId): Promise<RoomState | null>;
  /** Creates the initial state row at version 1. */
  create(draft: RoomStateDraft): Promise<RoomState>;
  /**
   * Compare-and-set. Succeeds only when the stored version still equals
   * `expectedVersion`, and returns the row at `expectedVersion + 1`.
   * @throws RepositoryError `SF-SYS-CONFLICT` when the version moved on.
   */
  update(
    roomId: EntityId,
    expectedVersion: number,
    patch: RoomStatePatch,
  ): Promise<RoomState>;
  /** Non-throwing variant for callers that resolve conflicts themselves. */
  tryUpdate(
    roomId: EntityId,
    expectedVersion: number,
    patch: RoomStatePatch,
  ): Promise<
    | { readonly outcome: "applied"; readonly state: RoomState }
    | { readonly outcome: "conflict"; readonly conflict: RoomStateConcurrencyInfo }
  >;
}

export interface RoomMemberRepository {
  findById(id: EntityId): Promise<RoomMember | null>;
  findByRoomAndProfile(roomId: EntityId, profileId: EntityId): Promise<RoomMember | null>;
  listByRoom(roomId: EntityId, query?: RoomMemberQuery): Promise<Page<RoomMember>>;
  /** Membership count in the given states — the input to capacity rules in Domain. */
  countByRoom(roomId: EntityId, states?: readonly MembershipState[]): Promise<number>;
  create(draft: RoomMemberDraft): Promise<RoomMember>;
  update(id: EntityId, patch: RoomMemberPatch): Promise<RoomMember>;
  /** Hard delete: membership rows carry no soft-delete column (Database Spec §3.2). */
  remove(id: EntityId): Promise<void>;
}

export interface InviteRepository {
  findById(id: EntityId): Promise<Invite | null>;
  findByCode(code: EntityCode): Promise<Invite | null>;
  listByRoom(roomId: EntityId, query?: InviteQuery): Promise<Page<Invite>>;
  listForInvitee(profileId: EntityId, query?: InviteQuery): Promise<Page<Invite>>;
  create(draft: InviteDraft): Promise<Invite>;
  update(id: EntityId, patch: InvitePatch): Promise<Invite>;
  remove(id: EntityId): Promise<void>;
}

export const ROOM_REPOSITORY: RepositoryToken<RoomRepository> =
  createRepositoryToken<RoomRepository>("RoomRepository");

export const ROOM_STATE_REPOSITORY: RepositoryToken<RoomStateRepository> =
  createRepositoryToken<RoomStateRepository>("RoomStateRepository");

export const ROOM_MEMBER_REPOSITORY: RepositoryToken<RoomMemberRepository> =
  createRepositoryToken<RoomMemberRepository>("RoomMemberRepository");

export const INVITE_REPOSITORY: RepositoryToken<InviteRepository> =
  createRepositoryToken<InviteRepository>("InviteRepository");
