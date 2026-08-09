/**
 * Room activation plan — Sprint H7.
 *
 * One room, one next thing to do. The screen never offers two equally weighted
 * primary actions, and it never shows an internal phase name: the plan below
 * turns observable room facts into a single call to action plus a short
 * progress trail with plain-language labels.
 */
import type { RoomPhase } from "./watch-source";

/** The single primary action offered to the viewer right now. */
export type ActivationAction =
  | "create_room"
  | "invite_someone"
  | "choose_content"
  | "start_countdown"
  | "open_provider"
  | "join_voice"
  | "wait_for_host"
  | "wait_for_countdown"
  | "mark_ready"
  | "none";

export type ActivationStepState = "done" | "current" | "todo";

export interface ActivationStep {
  /** Stable key; the label lives in the localization bundle. */
  readonly key: string;
  readonly state: ActivationStepState;
}

export interface ActivationPlan {
  readonly primary: ActivationAction;
  readonly steps: readonly ActivationStep[];
}

export interface ActivationInput {
  readonly isHost: boolean;
  /** People other than the viewer who are present in the room. */
  readonly guestCount: number;
  /**
   * True only once an invitation has actually been handed out. Presence is not
   * a substitute: a room can have guests from a link shared in a past session.
   */
  readonly inviteSent?: boolean;
  readonly hasContent: boolean;
  readonly isCountingDown: boolean;
  readonly phase: RoomPhase;
  /** True only when this room's content plays inside StreamFlow. */
  readonly isEmbedded: boolean;
  readonly hasOpenedProvider: boolean;
  readonly isSelfReady: boolean;
  readonly isVoiceConnected: boolean;
  readonly isVoiceAvailable: boolean;
}

const HOST_STEPS = [
  "room_created",
  "friend_invited",
  "content_selected",
  "ready_to_start",
  "watching_together",
] as const;

const GUEST_STEPS = [
  "joined_room",
  "waiting_for_content",
  "content_selected",
  "ready",
  "watching_together",
] as const;

function trail(keys: readonly string[], reachedIndex: number): readonly ActivationStep[] {
  return keys.map((key, index) => ({
    key,
    state: index < reachedIndex ? "done" : index === reachedIndex ? "current" : "todo",
  }));
}

export function deriveActivationPlan(input: ActivationInput): ActivationPlan {
  const watching = input.phase === "watching" || input.phase === "paused";
  const finished = input.phase === "ended" || input.phase === "closed";

  if (input.isHost) {
    const reached = finished
      ? HOST_STEPS.length - 1
      : watching
        ? 4
        : input.isCountingDown || (input.hasContent && input.guestCount > 0)
          ? 3
          : input.hasContent
            ? 2
            : input.guestCount > 0
              ? 1
              : 0;

    const primary: ActivationAction = finished
      ? "none"
      : watching
        ? input.isVoiceAvailable && !input.isVoiceConnected
          ? "join_voice"
          : "none"
        : input.isCountingDown
          ? !input.isEmbedded && !input.hasOpenedProvider
            ? "open_provider"
            : "wait_for_countdown"
          : input.guestCount === 0
            ? "invite_someone"
            : !input.hasContent
              ? "choose_content"
              : "start_countdown";

    return { primary, steps: trail(HOST_STEPS, reached) };
  }

  const reached = finished
    ? GUEST_STEPS.length - 1
    : watching
      ? 4
      : input.isCountingDown || input.isSelfReady
        ? 3
        : input.hasContent
          ? 2
          : 1;

  const primary: ActivationAction = finished
    ? "none"
    : watching
      ? input.isVoiceAvailable && !input.isVoiceConnected
        ? "join_voice"
        : "none"
      : !input.hasContent
        ? "wait_for_host"
        : !input.isEmbedded && !input.hasOpenedProvider
          ? "open_provider"
          : !input.isSelfReady
            ? "mark_ready"
            : input.isCountingDown
              ? "wait_for_countdown"
              : "wait_for_host";

  return { primary, steps: trail(GUEST_STEPS, reached) };
}
