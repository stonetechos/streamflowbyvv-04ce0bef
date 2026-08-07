/**
 * Room governance — Sprint H6.
 *
 * Pure rules for the social half of a watch party: who may act, what a room's
 * privacy settings say, what an invite link resolves to, and what a person's
 * presence actually means. Nothing here touches storage, React, or a vendor,
 * so every rule is decidable in a unit test (Build Rules §1).
 *
 * Honesty rule (ADR-014 in spirit): a state is only ever reported when it was
 * observed. "Watching" is never inferred from an open browser tab, and voice
 * states are only reported by the voice transport itself.
 */
import type { MetadataBag } from "@/domain/rooms/room.types";
import type { MembershipState, RoomRole, RoomStatus } from "@/domain/shared/domain-enums";

/** The role vocabulary the room UI speaks. `muted` is a participant state. */
export type RoomSeatRole = "host" | "co_host" | "participant" | "muted" | "removed";

export type ModerationAction =
  | "mute_participant"
  | "unmute_participant"
  | "remove_participant"
  | "close_room"
  | "lock_room"
  | "unlock_room"
  | "disable_chat"
  | "enable_chat"
  | "cancel_countdown"
  | "restart_countdown"
  | "lock_playback"
  | "select_media"
  | "send_chat"
  | "join_voice";

/** Room privacy and moderation settings, stored in the room metadata bag. */
export interface RoomGovernanceSettings {
  readonly isLocked: boolean;
  readonly isChatEnabled: boolean;
  readonly isPlaybackLocked: boolean;
  readonly isInviteActive: boolean;
  readonly inviteExpiresAt: string | null;
  readonly requiresHostApproval: boolean;
  readonly maxParticipants: number | null;
}

export const GOVERNANCE_METADATA_KEY = "governance";

/** Private by default: locked off, chat on, invite live, no approval queue. */
export const DEFAULT_GOVERNANCE: RoomGovernanceSettings = Object.freeze({
  isLocked: false,
  isChatEnabled: true,
  isPlaybackLocked: false,
  isInviteActive: true,
  inviteExpiresAt: null,
  requiresHostApproval: false,
  maxParticipants: null,
});

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Reads settings out of an opaque metadata bag; unknown shapes fall back. */
export function readGovernance(metadata: MetadataBag | null | undefined): RoomGovernanceSettings {
  const raw = metadata?.[GOVERNANCE_METADATA_KEY];
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return DEFAULT_GOVERNANCE;
  const bag = raw as Record<string, unknown>;
  const expiry = bag["inviteExpiresAt"];
  const max = bag["maxParticipants"];
  return {
    isLocked: bool(bag["isLocked"], DEFAULT_GOVERNANCE.isLocked),
    isChatEnabled: bool(bag["isChatEnabled"], DEFAULT_GOVERNANCE.isChatEnabled),
    isPlaybackLocked: bool(bag["isPlaybackLocked"], DEFAULT_GOVERNANCE.isPlaybackLocked),
    isInviteActive: bool(bag["isInviteActive"], DEFAULT_GOVERNANCE.isInviteActive),
    inviteExpiresAt: typeof expiry === "string" && expiry.length > 0 ? expiry : null,
    requiresHostApproval: bool(
      bag["requiresHostApproval"],
      DEFAULT_GOVERNANCE.requiresHostApproval,
    ),
    maxParticipants: typeof max === "number" && Number.isFinite(max) && max > 0 ? max : null,
  };
}

/** Produces the metadata bag to persist, preserving unrelated keys. */
export function writeGovernance(
  metadata: MetadataBag | null | undefined,
  patch: Partial<RoomGovernanceSettings>,
): MetadataBag {
  const current = readGovernance(metadata);
  const next: RoomGovernanceSettings = { ...current, ...patch };
  return { ...(metadata ?? {}), [GOVERNANCE_METADATA_KEY]: { ...next } };
}

/** Maps a stored membership onto the seat vocabulary the room UI speaks. */
export function seatRole(input: {
  readonly role: RoomRole;
  readonly state: MembershipState;
  readonly isMutedByHost: boolean;
}): RoomSeatRole {
  if (input.state === "removed") return "removed";
  if (input.role === "host") return "host";
  if (input.role === "co_host") return "co_host";
  return input.isMutedByHost ? "muted" : "participant";
}

const CONTROLLER_ACTIONS: readonly ModerationAction[] = [
  "mute_participant",
  "unmute_participant",
  "remove_participant",
  "lock_room",
  "unlock_room",
  "disable_chat",
  "enable_chat",
  "cancel_countdown",
  "restart_countdown",
  "lock_playback",
  "select_media",
];

/** Only the host may end the room for everyone. */
const HOST_ONLY_ACTIONS: readonly ModerationAction[] = ["close_room"];

export interface PermissionContext {
  readonly seat: RoomSeatRole;
  readonly settings: RoomGovernanceSettings;
  readonly roomStatus: RoomStatus;
}

/** The single answer to "may this seat do this?". Presentation only renders it. */
export function canPerform(action: ModerationAction, context: PermissionContext): boolean {
  const { seat, settings, roomStatus } = context;
  if (seat === "removed") return false;
  const roomIsOver = roomStatus === "ended" || roomStatus === "abandoned";
  if (roomIsOver) return false;

  if (action === "send_chat") {
    return settings.isChatEnabled;
  }
  if (action === "join_voice") {
    return seat !== "muted" || false;
  }
  if (HOST_ONLY_ACTIONS.includes(action)) return seat === "host";
  if (CONTROLLER_ACTIONS.includes(action)) return seat === "host" || seat === "co_host";
  return false;
}

/* ------------------------------------------------------------------ invites */

export type InviteResolution =
  | "valid"
  | "already_joined"
  | "expired"
  | "revoked"
  | "room_locked"
  | "room_full"
  | "room_closed"
  | "invalid";

export interface InviteFacts {
  /** Null when the token matched no room at all. */
  readonly roomStatus: RoomStatus | null;
  readonly settings: RoomGovernanceSettings;
  readonly seatsTaken: number;
  readonly capacity: number;
  readonly viewerMembership: MembershipState | null;
  readonly nowIso: string;
}

/**
 * One ordering, used by every join surface, so a person never sees "room full"
 * when the real reason was that the link had been revoked.
 */
export function resolveInvite(facts: InviteFacts): InviteResolution {
  if (facts.roomStatus === null) return "invalid";
  if (facts.viewerMembership === "removed") return "revoked";
  if (facts.viewerMembership === "joined") return "already_joined";
  if (facts.roomStatus === "ended" || facts.roomStatus === "abandoned") return "room_closed";
  if (!facts.settings.isInviteActive) return "revoked";
  if (facts.settings.inviteExpiresAt !== null) {
    const expiry = Date.parse(facts.settings.inviteExpiresAt);
    const now = Date.parse(facts.nowIso);
    if (Number.isFinite(expiry) && Number.isFinite(now) && expiry <= now) return "expired";
  }
  if (facts.settings.isLocked) return "room_locked";
  const capacity = facts.settings.maxParticipants ?? facts.capacity;
  if (facts.seatsTaken >= capacity) return "room_full";
  return "valid";
}

/* ----------------------------------------------------------------- presence */

/**
 * Presence as a person would describe it. Ordered from most to least engaged;
 * `watching` requires an observed watch phase, never a focused tab.
 */
export type SocialPresence =
  | "watching"
  | "voice_muted"
  | "voice_connected"
  | "ready"
  | "joined"
  | "reconnecting"
  | "disconnected"
  | "left"
  | "removed";

export interface PresenceFacts {
  readonly membership: MembershipState;
  /** Heartbeat liveness, as the presence store reports it. */
  readonly liveness: "online" | "idle" | "away" | "offline" | "unknown";
  /** True only when the room itself is in a watch phase for this person. */
  readonly isWatching: boolean;
  readonly hasSelfDeclaredReady: boolean;
  readonly voice: "connected" | "muted" | "off";
}

export function classifyPresence(facts: PresenceFacts): SocialPresence {
  if (facts.membership === "removed") return "removed";
  if (facts.membership === "left") return "left";
  if (facts.liveness === "unknown" || facts.liveness === "offline") return "disconnected";
  if (facts.liveness === "away") return "reconnecting";
  if (facts.isWatching) return "watching";
  if (facts.voice === "muted") return "voice_muted";
  if (facts.voice === "connected") return "voice_connected";
  if (facts.hasSelfDeclaredReady) return "ready";
  return "joined";
}

/* ----------------------------------------------------------- recovery rules */

/**
 * Reconnect safety: a snapshot is only adopted when it is at least as new as
 * what this device already holds. A stale reply never overwrites newer state.
 */
export function shouldAdoptSnapshot(input: {
  readonly localRevision: number;
  readonly incomingRevision: number;
}): boolean {
  return input.incomingRevision >= input.localRevision;
}

export type RecoveryPhase = "online" | "suspended" | "offline" | "recovering" | "recovered";

export function nextRecoveryPhase(input: {
  readonly isOnline: boolean;
  readonly isDocumentVisible: boolean;
  readonly wasInterrupted: boolean;
  readonly hasFreshSnapshot: boolean;
}): RecoveryPhase {
  if (!input.isOnline) return "offline";
  if (!input.isDocumentVisible) return "suspended";
  if (input.wasInterrupted && !input.hasFreshSnapshot) return "recovering";
  if (input.wasInterrupted && input.hasFreshSnapshot) return "recovered";
  return "online";
}
