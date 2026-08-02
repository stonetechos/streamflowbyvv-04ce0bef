/**
 * Room aggregate domain models — Sprint 1.7.
 *
 * Read-only value shapes the Repository layer must produce and consume. They
 * carry no persistence concern, no vendor type, and no behaviour: room
 * behaviour lives in the Sprint 1.6 services (Foundation §3).
 *
 * Traceability: Database Specification v1.0 §3.2 (rooms, room_members,
 * room_state) and §3.3 (invites); ADR-002 (lifecycle), ADR-003 (sync mode),
 * ADR-006 (invite model), ADR-013 (capacity).
 *
 * Conventions:
 * - Timestamps are ISO-8601 UTC strings; the Domain never holds a driver date.
 * - Absent values are `null`, mirroring the specification's nullability.
 * - `metadata` is an opaque bag; no Domain rule may depend on its contents.
 * - Secret columns (`join_code_hash`, `token_hash`) are NEVER modelled here
 *   (Foundation §10): a hash is credential material and stays in storage.
 */
import type {
  InviteChannel,
  InviteStatus,
  MembershipState,
  PlaybackStatus,
  RoomRole,
  RoomStatus,
  RoomVisibility,
  SyncMode,
} from "@/domain/shared/domain-enums";

/** Opaque, adapter-independent extension bag (Database Spec §4). */
export type MetadataBag = Readonly<Record<string, unknown>>;

/** ISO-8601 UTC instant. */
export type IsoTimestamp = string;

/** Room aggregate root — Database Spec §3.2 `rooms`. */
export interface Room {
  readonly id: string;
  /** Human-readable display code, e.g. `ROM-000001`. Never a key. */
  readonly code: string;
  readonly name: string;
  readonly status: RoomStatus;
  readonly visibility: RoomVisibility;
  readonly hostProfileId: string | null;
  readonly providerId: string | null;
  /** Provider-scoped reference to what is being watched. Never a media URL stream. */
  readonly contentReference: string | null;
  readonly maxMembers: number;
  readonly scheduledStartAt: IsoTimestamp | null;
  readonly startedAt: IsoTimestamp | null;
  readonly endedAt: IsoTimestamp | null;
  /** Expiry of the join link (Foundation §14.2). The link secret itself is not exposed. */
  readonly joinCodeExpiresAt: IsoTimestamp | null;
  readonly metadata: MetadataBag;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly deletedAt: IsoTimestamp | null;
}

/** Fields accepted when a room is first persisted. */
export interface RoomDraft {
  readonly code: string;
  readonly name: string;
  readonly status: RoomStatus;
  readonly visibility: RoomVisibility;
  readonly hostProfileId: string | null;
  readonly maxMembers: number;
  readonly providerId?: string | null;
  readonly contentReference?: string | null;
  readonly scheduledStartAt?: IsoTimestamp | null;
  readonly metadata?: MetadataBag;
}

/** Fields a caller may change on an existing room. Lifecycle rules live in Domain. */
export interface RoomPatch {
  readonly name?: string;
  readonly status?: RoomStatus;
  readonly visibility?: RoomVisibility;
  readonly providerId?: string | null;
  readonly contentReference?: string | null;
  readonly scheduledStartAt?: IsoTimestamp | null;
  readonly startedAt?: IsoTimestamp | null;
  readonly endedAt?: IsoTimestamp | null;
  readonly joinCodeExpiresAt?: IsoTimestamp | null;
  readonly metadata?: MetadataBag;
}

/**
 * Authoritative playback state for a room — Database Spec §3.2 `room_state`.
 * `version` is the optimistic-concurrency token (ADR-004): every write states
 * the version it read, and a losing writer is told so rather than overwriting.
 */
export interface RoomState {
  readonly id: string;
  readonly roomId: string;
  readonly playbackStatus: PlaybackStatus;
  readonly syncMode: SyncMode;
  readonly positionMs: number;
  readonly playbackRate: number;
  readonly anchorServerTime: IsoTimestamp | null;
  readonly countdownTargetAt: IsoTimestamp | null;
  readonly lastActorProfileId: string | null;
  readonly version: number;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface RoomStateDraft {
  readonly roomId: string;
  readonly playbackStatus: PlaybackStatus;
  readonly syncMode: SyncMode;
  readonly positionMs?: number;
  readonly playbackRate?: number;
  readonly anchorServerTime?: IsoTimestamp | null;
  readonly countdownTargetAt?: IsoTimestamp | null;
  readonly lastActorProfileId?: string | null;
}

/** Version is never patched by a caller; the repository increments it. */
export interface RoomStatePatch {
  readonly playbackStatus?: PlaybackStatus;
  readonly syncMode?: SyncMode;
  readonly positionMs?: number;
  readonly playbackRate?: number;
  readonly anchorServerTime?: IsoTimestamp | null;
  readonly countdownTargetAt?: IsoTimestamp | null;
  readonly lastActorProfileId?: string | null;
}

/** Room membership — Database Spec §3.2 `room_members`. */
export interface RoomMember {
  readonly id: string;
  readonly roomId: string;
  readonly profileId: string;
  readonly role: RoomRole;
  readonly state: MembershipState;
  readonly isMutedByHost: boolean;
  readonly joinedAt: IsoTimestamp | null;
  readonly leftAt: IsoTimestamp | null;
  readonly metadata: MetadataBag;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface RoomMemberDraft {
  readonly roomId: string;
  readonly profileId: string;
  readonly role: RoomRole;
  readonly state: MembershipState;
  readonly joinedAt?: IsoTimestamp | null;
  readonly metadata?: MetadataBag;
}

export interface RoomMemberPatch {
  readonly role?: RoomRole;
  readonly state?: MembershipState;
  readonly isMutedByHost?: boolean;
  readonly joinedAt?: IsoTimestamp | null;
  readonly leftAt?: IsoTimestamp | null;
  readonly metadata?: MetadataBag;
}

/**
 * Invitation — Database Spec §3.3 `invites`, ADR-006.
 * The delivery token is stored hashed and never surfaces as a domain field.
 */
export interface Invite {
  readonly id: string;
  readonly code: string;
  readonly roomId: string;
  readonly channel: InviteChannel;
  readonly status: InviteStatus;
  readonly inviterProfileId: string | null;
  readonly inviteeProfileId: string | null;
  readonly expiresAt: IsoTimestamp | null;
  readonly acceptedAt: IsoTimestamp | null;
  readonly declinedAt: IsoTimestamp | null;
  readonly revokedAt: IsoTimestamp | null;
  readonly metadata: MetadataBag;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly deletedAt: IsoTimestamp | null;
}

export interface InviteDraft {
  readonly code: string;
  readonly roomId: string;
  readonly channel: InviteChannel;
  readonly status: InviteStatus;
  readonly inviterProfileId: string | null;
  readonly inviteeProfileId?: string | null;
  readonly expiresAt?: IsoTimestamp | null;
  readonly metadata?: MetadataBag;
}

export interface InvitePatch {
  readonly status?: InviteStatus;
  readonly inviteeProfileId?: string | null;
  readonly expiresAt?: IsoTimestamp | null;
  readonly acceptedAt?: IsoTimestamp | null;
  readonly declinedAt?: IsoTimestamp | null;
  readonly revokedAt?: IsoTimestamp | null;
  readonly metadata?: MetadataBag;
}
