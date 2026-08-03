/**
 * Waiting Room derivation — Sprint 2.0.
 *
 * Pure functions over a Domain snapshot. Kept free of React and of the
 * Domain services so the ordering and labelling rules can be read — and later
 * tested — in one place.
 */
import {
  COUNTDOWN_SECONDS_METADATA_KEY,
  normalizeCountdownSeconds,
  type MemberPresence,
  type MetadataBag,
  type RoomMember,
  type WaitingRoomSnapshot,
} from "@/domain";
import { AppError } from "@/shared/constants/error-taxonomy";


import type {
  MemberPresenceView,
  MemberView,
  RoomSummaryView,
  ViewerView,
  WaitingRoomError,
} from "./waiting-room.types";

/** Host first, then joined members, then invitees; stable by join time. */
const ROLE_WEIGHT: Record<string, number> = { host: 0, co_host: 1, guest: 2 };
const STATE_WEIGHT: Record<string, number> = { joined: 0, invited: 1, left: 2, removed: 3 };

/**
 * The fallback stand-in for a display name (Sprint J.1: only used while a name
 * is loading, or when the profile is not visible to this viewer). The lobby
 * shows the identifier it legitimately holds rather than inventing a name.
 */
export function memberLabel(profileId: string): string {
  const compact = profileId.replace(/-/g, "");
  return compact.length <= 6 ? compact.toUpperCase() : compact.slice(0, 6).toUpperCase();
}

/**
 * Presence, collapsed for display. `unknown` is deliberate: when no presence
 * store is bound the lobby says nothing rather than claiming everyone is away.
 */
export function toPresenceView(
  presence: MemberPresence | undefined,
  isTracking: boolean,
): MemberPresenceView {
  if (!isTracking) return "unknown";
  if (!presence) return "offline";
  if (presence.isOnline) return presence.status === "idle" ? "idle" : "online";
  return presence.status === "disconnected" ? "away" : "offline";
}

/** Whole minutes since a heartbeat, floored; null when it is current. */
export function minutesSince(lastSeenAt: string | null, now: number): number | null {
  if (!lastSeenAt) return null;
  const elapsed = now - Date.parse(lastSeenAt);
  if (!Number.isFinite(elapsed) || elapsed < 60_000) return null;
  return Math.floor(elapsed / 60_000);
}

export interface PresenceLookup {
  readonly byProfileId: ReadonlyMap<string, MemberPresence>;
  readonly isTracking: boolean;
  readonly now: number;
}

const UNTRACKED: PresenceLookup = { byProfileId: new Map(), isTracking: false, now: 0 };

export function toMemberViews(
  snapshot: WaitingRoomSnapshot,
  viewerProfileId: string | null,
  isReady: (member: RoomMember) => boolean,
  presence: PresenceLookup = UNTRACKED,
  namesByProfileId: ReadonlyMap<string, string> = new Map(),
): readonly MemberView[] {
  return [...snapshot.members]
    .sort(
      (left, right) =>
        (STATE_WEIGHT[left.state] ?? 9) - (STATE_WEIGHT[right.state] ?? 9) ||
        (ROLE_WEIGHT[left.role] ?? 9) - (ROLE_WEIGHT[right.role] ?? 9) ||
        (left.joinedAt ?? left.createdAt).localeCompare(right.joinedAt ?? right.createdAt),
    )
    .map((member) => {
      const observed = presence.byProfileId.get(member.profileId);
      const presenceView = toPresenceView(observed, presence.isTracking);
      return {
        id: member.id,
        profileId: member.profileId,
        label: namesByProfileId.get(member.profileId) ?? memberLabel(member.profileId),
        role: member.role,
        state: member.state,
        isHost: member.role === "host" || member.profileId === snapshot.room.hostProfileId,
        isReady: isReady(member),
        isViewer: member.profileId === viewerProfileId,
        presence: presenceView,
        lastSeenAt: observed?.lastSeenAt ?? null,
        lastSeenMinutes:
          presenceView === "online" || presenceView === "unknown"
            ? null
            : minutesSince(observed?.lastSeenAt ?? null, presence.now),
      };
    });
}

/**
 * The host's chosen countdown length. Absent or malformed metadata falls back
 * to the specified default rather than to zero (System Constants).
 */
export function readCountdownSeconds(metadata: MetadataBag): number {
  const raw = metadata[COUNTDOWN_SECONDS_METADATA_KEY];
  return normalizeCountdownSeconds(typeof raw === "number" ? raw : Number.NaN);
}

export function toRoomSummary(snapshot: WaitingRoomSnapshot): RoomSummaryView {
  return {
    id: snapshot.room.id,
    code: snapshot.room.code,
    name: snapshot.room.name,
    status: snapshot.room.status,
    capacity: snapshot.room.maxMembers,
    joinedCount: snapshot.joinedCount,
    pendingInviteCount: snapshot.pendingInvites.length,
    scheduledStartAt: snapshot.room.scheduledStartAt,
    providerId: snapshot.room.providerId,
    contentReference: snapshot.room.contentReference,
    countdownSeconds: readCountdownSeconds(snapshot.room.metadata),
  };
}

export function toViewerView(
  snapshot: WaitingRoomSnapshot,
  viewerProfileId: string | null,
  isReady: (member: RoomMember) => boolean,
): ViewerView {
  const membership = snapshot.viewerMembership;
  return {
    profileId: viewerProfileId,
    memberId: membership?.id ?? null,
    isMember: membership?.state === "joined",
    isHost: membership?.role === "host" || snapshot.room.hostProfileId === viewerProfileId,
    isReady: membership ? isReady(membership) : false,
    // Carried verbatim from the Domain snapshot: Presentation never evaluates
    // lifecycle or capacity for itself (Milestone D.5).
    canJoin: snapshot.canViewerJoin,
  };
}

/** Maps a thrown value onto the error taxonomy without guessing a cause. */
export function toWaitingRoomError(error: unknown): WaitingRoomError {
  // Sprint J.1.5 — the domain already decided the reason and carries its own
  // localization key. Presentation reads that decision instead of re-deriving
  // it from a code table that silently goes stale.
  if (error instanceof AppError) {
    return {
      code: error.code,
      messageKey: error.descriptor.messageKey ?? "error.sys.unexpected",
    };
  }

  const raw =
    error instanceof Error
      ? ((error as Error & { code?: string }).code ?? error.message)
      : String(error);
  const code = /^SF-[A-Z]+-[A-Z-]+$/.test(raw) ? raw : "SF-SYS-UNEXPECTED";
  return { code, messageKey: "error.sys.unexpected" };
}

