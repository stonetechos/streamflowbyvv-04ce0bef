/**
 * Reliability guidance — Sprint H7.
 *
 * Every failure the room can show answers four questions: what happened, is
 * the party still on, what should I do, and is retrying safe. Raw exceptions,
 * vendor status codes and internal identifiers never reach this layer — the
 * caller maps its failure to one of the kinds below, and the copy comes from
 * the localization bundle.
 */

export const FAILURE_KINDS = [
  "connection_lost",
  "backgrounded",
  "snapshot_stale",
  "provider_launched_elsewhere",
  "provider_launch_failed",
  "manual_sync_required",
  "voice_failed",
  "voice_permission_denied",
  "chat_send_failed",
  "room_start_failed",
  "room_full",
  "room_locked",
  "invite_expired",
] as const;

export type FailureKind = (typeof FAILURE_KINDS)[number];

export interface FailureGuidance {
  readonly kind: FailureKind;
  /** `room.failure.<kind>.what` — what happened, in plain language. */
  readonly whatKey: string;
  /** `room.failure.<kind>.next` — the single next step. */
  readonly nextKey: string;
  /** Whether the party continues without this person's action. */
  readonly roomStillActive: boolean;
  /** Whether pressing the action again is safe (idempotent or harmless). */
  readonly retrySafe: boolean;
  readonly tone: "warning" | "info";
}

const GUIDANCE: Readonly<
  Record<FailureKind, Omit<FailureGuidance, "kind" | "whatKey" | "nextKey">>
> = {
  connection_lost: { roomStillActive: true, retrySafe: true, tone: "warning" },
  backgrounded: { roomStillActive: true, retrySafe: true, tone: "info" },
  snapshot_stale: { roomStillActive: true, retrySafe: true, tone: "info" },
  provider_launched_elsewhere: { roomStillActive: true, retrySafe: true, tone: "info" },
  provider_launch_failed: { roomStillActive: true, retrySafe: true, tone: "warning" },
  manual_sync_required: { roomStillActive: true, retrySafe: true, tone: "info" },
  voice_failed: { roomStillActive: true, retrySafe: true, tone: "warning" },
  voice_permission_denied: { roomStillActive: true, retrySafe: true, tone: "info" },
  chat_send_failed: { roomStillActive: true, retrySafe: true, tone: "warning" },
  room_start_failed: { roomStillActive: true, retrySafe: true, tone: "warning" },
  room_full: { roomStillActive: true, retrySafe: false, tone: "warning" },
  room_locked: { roomStillActive: true, retrySafe: false, tone: "warning" },
  invite_expired: { roomStillActive: false, retrySafe: false, tone: "warning" },
};

export function describeFailure(kind: FailureKind): FailureGuidance {
  return {
    kind,
    whatKey: `room.failure.${kind}.what`,
    nextKey: `room.failure.${kind}.next`,
    ...GUIDANCE[kind],
  };
}

export function isFailureKind(value: string): value is FailureKind {
  return (FAILURE_KINDS as readonly string[]).includes(value);
}
