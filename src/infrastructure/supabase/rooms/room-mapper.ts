/**
 * Room entity mappers — Sprint 1.7 (Sprint 1.3 §2).
 *
 * The only module that knows the physical shape of the room cluster tables.
 * Rows enter, domain models leave; nothing above Infrastructure sees a column
 * name. Mappers are pure: no I/O, no validation side effects, no logging.
 *
 * Enum-typed columns are stored as text and narrowed here. A value absent from
 * the mirrored domain enum (Build Rules §16) means the database moved ahead of
 * the application, so the mapper fails loudly rather than inventing a state.
 */
import type {
  Invite,
  InviteDraft,
  InvitePatch,
  MetadataBag,
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
import {
  INVITE_CHANNELS,
  INVITE_STATUSES,
  MEMBERSHIP_STATES,
  PLAYBACK_STATUSES,
  ROOM_ROLES,
  ROOM_STATUSES,
  ROOM_VISIBILITIES,
  SYNC_MODES,
} from "@/domain/shared/domain-enums";
import { REPOSITORY_ERRORS, RepositoryError } from "@/repository";

import type { Json, TableInsert, TableRow, TableUpdate } from "../supabase.types";

export type RoomRow = TableRow<"rooms">;
export type RoomInsert = TableInsert<"rooms">;
export type RoomUpdate = TableUpdate<"rooms">;

export type RoomStateRow = TableRow<"room_state">;
export type RoomStateInsert = TableInsert<"room_state">;
export type RoomStateUpdate = TableUpdate<"room_state">;

export type RoomMemberRow = TableRow<"room_members">;
export type RoomMemberInsert = TableInsert<"room_members">;
export type RoomMemberUpdate = TableUpdate<"room_members">;

export type InviteRow = TableRow<"invites">;
export type InviteInsert = TableInsert<"invites">;
export type InviteUpdate = TableUpdate<"invites">;

/**
 * Explicit projections. `select("*")` would drag every future column — and any
 * secret one — across the boundary; the hash columns are excluded by design
 * (Foundation §10).
 */
export const ROOM_COLUMNS =
  "id, code, name, status, visibility, host_profile_id, provider_id, content_reference, max_members, scheduled_start_at, started_at, ended_at, join_code_expires_at, metadata, created_at, updated_at, deleted_at";

export const ROOM_STATE_COLUMNS =
  "id, room_id, playback_status, sync_mode, position_ms, playback_rate, anchor_server_time, countdown_target_at, last_actor_profile_id, version, created_at, updated_at";

export const ROOM_MEMBER_COLUMNS =
  "id, room_id, profile_id, role, state, is_muted_by_host, joined_at, left_at, metadata, created_at, updated_at";

export const INVITE_COLUMNS =
  "id, code, room_id, channel, status, inviter_profile_id, invitee_profile_id, expires_at, accepted_at, declined_at, revoked_at, metadata, created_at, updated_at, deleted_at";

function narrow<T extends string>(
  allowed: readonly T[],
  value: string,
  aggregate: string,
  column: string,
): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new RepositoryError(REPOSITORY_ERRORS.CONSTRAINT_VIOLATION, {
    aggregate,
    operation: `map:${column}`,
  });
}

/** `metadata` is `jsonb` and may legitimately hold a scalar; only objects map. */
function toMetadata(value: Json | null | undefined): MetadataBag {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.freeze({ ...(value as Record<string, unknown>) });
  }
  return Object.freeze({});
}

function fromMetadata(value: MetadataBag | undefined): Json | undefined {
  return value === undefined ? undefined : ({ ...value } as Json);
}

/** Drops keys the caller never set, so a patch never nulls an untouched column. */
function prune<T extends Record<string, unknown>>(candidate: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (value !== undefined) result[key] = value;
  }
  return result as T;
}

export function toRoom(row: RoomRow): Room {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    status: narrow(ROOM_STATUSES, row.status, "room", "status"),
    visibility: narrow(ROOM_VISIBILITIES, row.visibility, "room", "visibility"),
    hostProfileId: row.host_profile_id,
    providerId: row.provider_id,
    contentReference: row.content_reference,
    maxMembers: row.max_members,
    scheduledStartAt: row.scheduled_start_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    joinCodeExpiresAt: row.join_code_expires_at,
    metadata: toMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function toRoomInsert(draft: RoomDraft): RoomInsert {
  return prune({
    code: draft.code,
    name: draft.name,
    status: draft.status,
    visibility: draft.visibility,
    host_profile_id: draft.hostProfileId,
    max_members: draft.maxMembers,
    provider_id: draft.providerId,
    content_reference: draft.contentReference,
    scheduled_start_at: draft.scheduledStartAt,
    metadata: fromMetadata(draft.metadata),
  }) as RoomInsert;
}

export function toRoomUpdate(patch: RoomPatch): RoomUpdate {
  return prune({
    name: patch.name,
    status: patch.status,
    visibility: patch.visibility,
    provider_id: patch.providerId,
    content_reference: patch.contentReference,
    scheduled_start_at: patch.scheduledStartAt,
    started_at: patch.startedAt,
    ended_at: patch.endedAt,
    join_code_expires_at: patch.joinCodeExpiresAt,
    metadata: fromMetadata(patch.metadata),
  }) as RoomUpdate;
}

export function toRoomState(row: RoomStateRow): RoomState {
  return {
    id: row.id,
    roomId: row.room_id,
    playbackStatus: narrow(PLAYBACK_STATUSES, row.playback_status, "room_state", "playback_status"),
    syncMode: narrow(SYNC_MODES, row.sync_mode, "room_state", "sync_mode"),
    positionMs: row.position_ms,
    playbackRate: row.playback_rate,
    anchorServerTime: row.anchor_server_time,
    countdownTargetAt: row.countdown_target_at,
    lastActorProfileId: row.last_actor_profile_id,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRoomStateInsert(draft: RoomStateDraft): RoomStateInsert {
  return prune({
    room_id: draft.roomId,
    playback_status: draft.playbackStatus,
    sync_mode: draft.syncMode,
    position_ms: draft.positionMs,
    playback_rate: draft.playbackRate,
    anchor_server_time: draft.anchorServerTime,
    countdown_target_at: draft.countdownTargetAt,
    last_actor_profile_id: draft.lastActorProfileId,
  }) as RoomStateInsert;
}

/** `version` is supplied by the repository, never by the caller's patch. */
export function toRoomStateUpdate(patch: RoomStatePatch, nextVersion: number): RoomStateUpdate {
  return {
    ...prune({
      playback_status: patch.playbackStatus,
      sync_mode: patch.syncMode,
      position_ms: patch.positionMs,
      playback_rate: patch.playbackRate,
      anchor_server_time: patch.anchorServerTime,
      countdown_target_at: patch.countdownTargetAt,
      last_actor_profile_id: patch.lastActorProfileId,
    }),
    version: nextVersion,
  } as RoomStateUpdate;
}

export function toRoomMember(row: RoomMemberRow): RoomMember {
  return {
    id: row.id,
    roomId: row.room_id,
    profileId: row.profile_id,
    role: narrow(ROOM_ROLES, row.role, "room_member", "role"),
    state: narrow(MEMBERSHIP_STATES, row.state, "room_member", "state"),
    isMutedByHost: row.is_muted_by_host,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    metadata: toMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRoomMemberInsert(draft: RoomMemberDraft): RoomMemberInsert {
  return prune({
    room_id: draft.roomId,
    profile_id: draft.profileId,
    role: draft.role,
    state: draft.state,
    joined_at: draft.joinedAt,
    metadata: fromMetadata(draft.metadata),
  }) as RoomMemberInsert;
}

export function toRoomMemberUpdate(patch: RoomMemberPatch): RoomMemberUpdate {
  return prune({
    role: patch.role,
    state: patch.state,
    is_muted_by_host: patch.isMutedByHost,
    joined_at: patch.joinedAt,
    left_at: patch.leftAt,
    metadata: fromMetadata(patch.metadata),
  }) as RoomMemberUpdate;
}

export function toInvite(row: InviteRow): Invite {
  return {
    id: row.id,
    code: row.code,
    roomId: row.room_id,
    channel: narrow(INVITE_CHANNELS, row.channel, "invite", "channel"),
    status: narrow(INVITE_STATUSES, row.status, "invite", "status"),
    inviterProfileId: row.inviter_profile_id,
    inviteeProfileId: row.invitee_profile_id,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    declinedAt: row.declined_at,
    revokedAt: row.revoked_at,
    metadata: toMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function toInviteInsert(draft: InviteDraft): InviteInsert {
  return prune({
    code: draft.code,
    room_id: draft.roomId,
    channel: draft.channel,
    status: draft.status,
    inviter_profile_id: draft.inviterProfileId,
    invitee_profile_id: draft.inviteeProfileId,
    expires_at: draft.expiresAt,
    metadata: fromMetadata(draft.metadata),
  }) as InviteInsert;
}

export function toInviteUpdate(patch: InvitePatch): InviteUpdate {
  return prune({
    status: patch.status,
    invitee_profile_id: patch.inviteeProfileId,
    expires_at: patch.expiresAt,
    accepted_at: patch.acceptedAt,
    declined_at: patch.declinedAt,
    revoked_at: patch.revokedAt,
    metadata: fromMetadata(patch.metadata),
  }) as InviteUpdate;
}
