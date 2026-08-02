/**
 * Waiting Room view models — Sprint 2.0.
 *
 * Presentation-shaped projections of Domain aggregates. Nothing here decides
 * anything: derivation is mechanical, and every rule that matters already
 * lives in the Sprint 1.6 services (Build Rules §1).
 */
import type { MembershipState, RoomRole, RoomStatus } from "@/domain";

export type WaitingRoomStatus = "loading" | "ready" | "error";

/** Which action is in flight; the UI disables the matching control only. */
export type WaitingRoomPendingAction = "join" | "leave" | "readiness" | null;

export interface WaitingRoomError {
  readonly code: string;
  /** Translation key prefix; `.title` resolves the heading. */
  readonly messageKey: string;
}

/** Presence, as the lobby shows it. Derived in Domain, never guessed here. */
export type MemberPresenceView = "online" | "idle" | "away" | "offline" | "unknown";

export interface MemberView {
  readonly id: string;
  readonly profileId: string;
  /** Short, stable label derived from the profile identifier. */
  readonly label: string;
  readonly role: RoomRole;
  readonly state: MembershipState;
  readonly isHost: boolean;
  readonly isReady: boolean;
  readonly isViewer: boolean;
  readonly presence: MemberPresenceView;
  /** ISO-8601 of the last heartbeat; null while presence is untracked. */
  readonly lastSeenAt: string | null;
  /** Whole minutes since the last heartbeat; null when online or untracked. */
  readonly lastSeenMinutes: number | null;
}

export interface RoomSummaryView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: RoomStatus;
  readonly capacity: number;
  readonly joinedCount: number;
  readonly pendingInviteCount: number;
  readonly scheduledStartAt: string | null;
  /** Provider the host has chosen for this room, if any (Sprint 2.2). */
  readonly providerId: string | null;
  /** Stored countdown length in seconds; clamped to the system envelope. */
  readonly countdownSeconds: number;
}

export interface ViewerView {
  readonly profileId: string | null;
  readonly memberId: string | null;
  readonly isMember: boolean;
  readonly isHost: boolean;
  readonly isReady: boolean;
}
