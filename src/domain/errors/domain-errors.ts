/**
 * Shared domain error taxonomy — Sprint 1.6 §5.
 *
 * Traceability: Foundation §16.1 grammar `SF-<DOMAIN>-<CONDITION>`. These are
 * the conditions the orchestration services in this sprint can actually raise —
 * nothing speculative. Feature sprints add their own descriptors next to the
 * module that raises them (Build Rules §21).
 */
import { AppError, type AppErrorDescriptor } from "@/shared/constants/error-taxonomy";

export const DOMAIN_ERRORS = Object.freeze({
  /** Input violated a documented invariant before any state changed. */
  INVALID_INPUT: {
    code: "SF-SYS-INVALID-INPUT",
    messageKey: "error.sys.invalid_input",
    severity: "warning",
    retryable: false,
  },
  /** A required collaborator is not bound at the composition root. */
  SERVICE_UNAVAILABLE: {
    code: "SF-SYS-SERVICE-UNAVAILABLE",
    messageKey: "error.sys.service_unavailable",
    severity: "error",
    retryable: true,
    recoveryActionKey: "error.action.retry",
  },
  /** Milestone E — a profile row the caller is entitled to read is absent. */
  PROFILE_NOT_FOUND: {
    code: "SF-SYS-PROFILE-NOT-FOUND",
    messageKey: "error.sys.profile_not_found",
    severity: "error",
    retryable: false,
    recoveryActionKey: "error.action.go_home",
  },
  /** Milestone F.0 — the friendship edge is absent, or gone since it was read. */
  FRIENDSHIP_NOT_FOUND: {
    code: "SF-SYS-FRIENDSHIP-NOT-FOUND",
    messageKey: "error.social.friendship_not_found",
    severity: "warning",
    retryable: false,
  },
  /** Milestone F.0 — the caller is not a party to this friendship edge. */
  FRIENDSHIP_FORBIDDEN: {
    code: "SF-SYS-FRIENDSHIP-FORBIDDEN",
    messageKey: "error.social.friendship_forbidden",
    severity: "error",
    retryable: false,
  },
  /** Milestone F.0 — the edge is not in a state that permits this answer. */
  FRIENDSHIP_INVALID_STATE: {
    code: "SF-SYS-FRIENDSHIP-INVALID-STATE",
    messageKey: "error.social.friendship_invalid_state",
    severity: "warning",
    retryable: false,
  },
  /** Foundation §19 rate-limit policy. */

  RATE_LIMITED: {
    code: "SF-SYS-RATE-LIMITED",
    messageKey: "error.sys.rate_limited",
    severity: "warning",
    retryable: true,
    recoveryActionKey: "error.action.retry",
  },
  ROOM_CAPACITY_EXCEEDED: {
    code: "SF-ROOM-CAPACITY-EXCEEDED",
    messageKey: "error.room.capacity_exceeded",
    severity: "warning",
    retryable: false,
  },
  ROOM_INVALID_TRANSITION: {
    code: "SF-ROOM-INVALID-TRANSITION",
    messageKey: "error.room.invalid_transition",
    severity: "error",
    retryable: false,
  },
  ROOM_NOT_ACTIVE: {
    code: "SF-ROOM-NOT-ACTIVE",
    messageKey: "error.room.not_active",
    severity: "warning",
    retryable: false,
  },
  ROOM_NOT_FOUND: {
    code: "SF-ROOM-NOT-FOUND",
    messageKey: "error.room.not_found",
    severity: "warning",
    retryable: false,
  },
  ROOM_FORBIDDEN: {
    code: "SF-ROOM-FORBIDDEN",
    messageKey: "error.room.forbidden",
    severity: "warning",
    retryable: false,
  },
  ROOM_ALREADY_MEMBER: {
    code: "SF-ROOM-ALREADY-MEMBER",
    messageKey: "error.room.already_member",
    severity: "warning",
    retryable: false,
  },
  /** Sprint J.1.5 — the room existed, then the host ended it. */
  ROOM_ENDED: {
    code: "SF-ROOM-ENDED",
    messageKey: "error.room.ended",
    severity: "warning",
    retryable: false,
  },
  /** Sprint J.1.5 — the room row is soft-deleted (archived). */
  ROOM_DELETED: {
    code: "SF-ROOM-DELETED",
    messageKey: "error.room.deleted",
    severity: "warning",
    retryable: false,
  },
  /** Sprint J.1.5 — a block exists between the caller and the host (ADR-011). */
  ROOM_BLOCKED: {
    code: "SF-ROOM-BLOCKED",
    messageKey: "error.room.blocked",
    severity: "warning",
    retryable: false,
  },
  /** Sprint J.1.5 — the caller is still joined to a different open room. */
  ROOM_ALREADY_IN_ANOTHER_ROOM: {
    code: "SF-ROOM-ALREADY-IN-ANOTHER-ROOM",
    messageKey: "error.room.already_in_another_room",
    severity: "warning",
    retryable: false,
    recoveryActionKey: "error.action.leave_other_room",
  },
  /** Sprint J.1.5 — the host removed this person from the room. */
  ROOM_MEMBER_REMOVED: {
    code: "SF-ROOM-MEMBER-REMOVED",
    messageKey: "error.room.member_removed",
    severity: "warning",
    retryable: false,
  },

  ROOM_MEMBER_NOT_FOUND: {
    code: "SF-ROOM-MEMBER-NOT-FOUND",
    messageKey: "error.room.member_not_found",
    severity: "warning",
    retryable: false,
  },
  INVITE_NOT_FOUND: {
    code: "SF-INVITE-NOT-FOUND",
    messageKey: "error.invite.not_found",
    severity: "warning",
    retryable: false,
  },
  INVITE_EXPIRED: {
    code: "SF-INVITE-EXPIRED",
    messageKey: "error.invite.expired",
    severity: "warning",
    retryable: false,
  },
  INVITE_NOT_PENDING: {
    code: "SF-INVITE-NOT-PENDING",
    messageKey: "error.invite.not_pending",
    severity: "warning",
    retryable: false,
  },
  SYNC_COUNTDOWN_OUT_OF_RANGE: {
    code: "SF-SYNC-COUNTDOWN-OUT-OF-RANGE",
    messageKey: "error.sync.countdown_out_of_range",
    severity: "warning",
    retryable: false,
  },
  SYNC_RESYNC_REQUIRED: {
    code: "SF-SYNC-RESYNC-REQUIRED",
    messageKey: "error.sync.resync_required",
    severity: "warning",
    retryable: true,
    recoveryActionKey: "error.action.retry",
  },
  VOICE_SESSION_NOT_ACTIVE: {
    code: "SF-VOICE-SESSION-NOT-ACTIVE",
    messageKey: "error.voice.session_not_active",
    severity: "warning",
    retryable: false,
  },
  PROVIDER_CAPABILITY_UNSUPPORTED: {
    code: "SF-PROVIDER-CAPABILITY-UNSUPPORTED",
    messageKey: "error.provider.capability_unsupported",
    severity: "warning",
    retryable: false,
  },
  COMPLIANCE_ACTION_BLOCKED: {
    code: "SF-COMPLIANCE-ACTION-BLOCKED",
    messageKey: "error.compliance.action_blocked",
    severity: "error",
    retryable: false,
  },
}) satisfies Record<string, AppErrorDescriptor>;

export type DomainErrorKey = keyof typeof DOMAIN_ERRORS;

export interface DomainErrorContext {
  /** Service method that refused, e.g. `RoomService.joinMember`. */
  readonly operation: string;
  /** Aggregate the refusal is about. Never user content, never a credential. */
  readonly aggregateId?: string;
}

export class DomainError extends AppError {
  readonly context: DomainErrorContext;

  constructor(
    descriptor: AppErrorDescriptor,
    context: DomainErrorContext,
    options?: { cause?: unknown },
  ) {
    super(descriptor, options);
    this.name = "DomainError";
    this.context = context;
  }
}

export function domainError(
  key: DomainErrorKey,
  context: DomainErrorContext,
  options?: { cause?: unknown },
): DomainError {
  return new DomainError(DOMAIN_ERRORS[key], context, options);
}

/** Guard helper: raises `INVALID_INPUT` when a documented invariant fails. */
export function assertDomain(
  condition: boolean,
  key: DomainErrorKey,
  context: DomainErrorContext,
): asserts condition {
  if (!condition) throw domainError(key, context);
}
