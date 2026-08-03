/**
 * Social row mapping — Milestone F.0.
 *
 * The only place that knows the friendship edge is stored in a table called
 * `friendships`, or that a person's avatar mark still lives in `avatar_url`.
 */
import type {
  BlockRecord,
  DirectoryProfileRecord,
  FriendshipRecord,
  FriendshipStatusValue,
  RecentPartnerRecord,
} from "@/repository";

export const FRIENDSHIP_COLUMNS =
  "id, code, requester_profile_id, addressee_profile_id, status, responded_at, created_at, updated_at";

export const DIRECTORY_COLUMNS = "id, code, display_name, handle, avatar_url, bio";

export interface FriendshipRow {
  id: string;
  /** Allocated by the `FRN` code trigger just after insert, so briefly absent. */
  code: string | null;
  requester_profile_id: string;
  addressee_profile_id: string;
  status: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectoryRow {
  id: string;
  code: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  bio: string | null;
}

export interface BlockRow {
  id: string;
  profile_id: string;
  blocked_profile_id: string;
  reason: string | null;
  created_at: string;
}

export interface RecentPartnerRow {
  partner_profile_id: string;
  last_watched_at: string;
  session_count: number;
}

export function toFriendshipRecord(row: FriendshipRow): FriendshipRecord {
  return Object.freeze({
    id: row.id,
    code: row.code ?? "",
    requesterProfileId: row.requester_profile_id,
    addresseeProfileId: row.addressee_profile_id,
    status: row.status as FriendshipStatusValue,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function toDirectoryRecord(row: DirectoryRow): DirectoryProfileRecord {
  return Object.freeze({
    id: row.id,
    code: row.code,
    displayName: row.display_name,
    handle: row.handle,
    avatarPreset: row.avatar_url,
    bio: row.bio,
  });
}

export function toBlockRecord(row: BlockRow): BlockRecord {
  return Object.freeze({
    id: row.id,
    profileId: row.profile_id,
    blockedProfileId: row.blocked_profile_id,
    reason: row.reason,
    createdAt: row.created_at,
  });
}

export function toRecentPartnerRecord(row: RecentPartnerRow): RecentPartnerRecord {
  return Object.freeze({
    partnerProfileId: row.partner_profile_id,
    lastWatchedAt: row.last_watched_at,
    sessionCount: row.session_count,
  });
}

/** Escapes the characters PostgREST treats as pattern syntax. */
export function escapeSearchTerm(term: string): string {
  return term.replace(/[%,()*\\]/g, " ").trim();
}
