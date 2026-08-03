/**
 * Social persistence contracts — Milestone F.0, Foundation §User & Social.
 *
 * Four small contracts rather than one large one, because they are owned by
 * four different aggregates: the friendship edge, the block list, the recent
 * partners projection read side, and the profile directory that user search
 * reads. Expressed entirely in Domain terms — no table or column appears here.
 */
import type { EntityCode, EntityId } from "@/repository/repository.types";
import { createRepositoryToken, type RepositoryToken } from "@/repository/repository-registry";

/** Lifecycle of a single friendship edge (Milestone F.0). */
export type FriendshipStatusValue = "pending" | "accepted" | "declined" | "cancelled";

export interface FriendshipRecord {
  readonly id: EntityId;
  readonly code: EntityCode;
  readonly requesterProfileId: EntityId;
  readonly addresseeProfileId: EntityId;
  readonly status: FriendshipStatusValue;
  readonly respondedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FriendshipRepository {
  /** Every edge this profile is part of, in either direction. */
  listForProfile(profileId: EntityId): Promise<readonly FriendshipRecord[]>;
  /** The edge between two profiles regardless of direction, if any. */
  findBetween(profileId: EntityId, otherProfileId: EntityId): Promise<FriendshipRecord | null>;
  findById(friendshipId: EntityId): Promise<FriendshipRecord | null>;
  /** Creates a pending request, or revives a previously closed edge. */
  request(requesterProfileId: EntityId, addresseeProfileId: EntityId): Promise<FriendshipRecord>;
  setStatus(
    friendshipId: EntityId,
    status: FriendshipStatusValue,
    respondedAt: string | null,
  ): Promise<FriendshipRecord>;
  remove(friendshipId: EntityId): Promise<void>;
}

export interface BlockRecord {
  readonly id: EntityId;
  readonly profileId: EntityId;
  readonly blockedProfileId: EntityId;
  readonly reason: string | null;
  readonly createdAt: string;
}

export interface BlockRepository {
  listForProfile(profileId: EntityId): Promise<readonly BlockRecord[]>;
  block(profileId: EntityId, blockedProfileId: EntityId, reason: string | null): Promise<void>;
  unblock(profileId: EntityId, blockedProfileId: EntityId): Promise<void>;
}

/** One row of the recent-partners projection, read side (Sprint 1.9). */
export interface RecentPartnerRecord {
  readonly partnerProfileId: EntityId;
  readonly lastWatchedAt: string;
  readonly sessionCount: number;
}

export interface RecentPartnerReadRepository {
  listForProfile(profileId: EntityId, limit: number): Promise<readonly RecentPartnerRecord[]>;
}

/** The searchable, public-facing view of a person. Never includes contact data. */
export interface DirectoryProfileRecord {
  readonly id: EntityId;
  readonly code: EntityCode;
  readonly displayName: string;
  readonly handle: string;
  readonly avatarPreset: string | null;
  readonly bio: string | null;
}

export interface ProfileDirectoryRepository {
  /** Matches on display name, handle, or profile code. Blocked people never match. */
  search(term: string, limit: number): Promise<readonly DirectoryProfileRecord[]>;
  findById(profileId: EntityId): Promise<DirectoryProfileRecord | null>;
  findManyByIds(profileIds: readonly EntityId[]): Promise<readonly DirectoryProfileRecord[]>;
}

export const FRIENDSHIP_REPOSITORY: RepositoryToken<FriendshipRepository> =
  createRepositoryToken<FriendshipRepository>("FriendshipRepository");

export const BLOCK_REPOSITORY: RepositoryToken<BlockRepository> =
  createRepositoryToken<BlockRepository>("BlockRepository");

export const RECENT_PARTNER_READ_REPOSITORY: RepositoryToken<RecentPartnerReadRepository> =
  createRepositoryToken<RecentPartnerReadRepository>("RecentPartnerReadRepository");

export const PROFILE_DIRECTORY_REPOSITORY: RepositoryToken<ProfileDirectoryRepository> =
  createRepositoryToken<ProfileDirectoryRepository>("ProfileDirectoryRepository");
