/**
 * Waiting Room derivation — Sprint 2.0.
 *
 * Pure functions over a Domain snapshot. Kept free of React and of the
 * Domain services so the ordering and labelling rules can be read — and later
 * tested — in one place.
 */
import type { MemberPresence, RoomMember, WaitingRoomSnapshot } from "@/domain";

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
 * A readable stand-in for a display name. Profile records are a later sprint,
 * so the lobby shows the identifier it legitimately holds rather than
 * inventing a name.
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
      label: memberLabel(member.profileId),
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
  };
}

/** Maps a thrown value onto the error taxonomy without guessing a cause. */
export function toWaitingRoomError(error: unknown): WaitingRoomError {
  const raw =
    error instanceof Error
      ? ((error as Error & { code?: string }).code ?? error.message)
      : String(error);
  const code = /^SF-[A-Z]+-[A-Z-]+$/.test(raw) ? raw : "SF-SYS-UNEXPECTED";

  const known: Record<string, string> = {
    "SF-ROOM-NOT-FOUND": "error.room.not_found",
    "SF-ROOM-MEMBER-NOT-FOUND": "error.room.member_not_found",
    "SF-ROOM-CAPACITY-EXCEEDED": "error.room.capacity_exceeded",
    "SF-ROOM-FORBIDDEN": "error.room.forbidden",
    "SF-ROOM-ALREADY-MEMBER": "error.room.already_member",
    "SF-ROOM-NOT-ACTIVE": "error.room.not_active",
    "SF-SYS-SERVICE-UNAVAILABLE": "error.sys.service_unavailable",
    "SF-SYS-PERSISTENCE-UNAVAILABLE": "error.sys.persistence_unavailable",
    "SF-SYS-CONFLICT": "error.sys.conflict",
  };

  return { code, messageKey: known[code] ?? "error.sys.unexpected" };
}
