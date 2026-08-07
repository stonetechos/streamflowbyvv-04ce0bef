/**
 * Beta feedback capture — Sprint H7.
 *
 * Two questions, both optional, and never while a party is live. The comment
 * is free text the person chose to write; it is kept as-is and is never mined,
 * never attached to an account, and never mixed into the analytics props bag.
 */
import type { RoomPhase } from "./watch-source";

export const FEEDBACK_OUTCOMES = ["yes", "partly", "no"] as const;
export type FeedbackOutcome = (typeof FEEDBACK_OUTCOMES)[number];

export const FEEDBACK_CATEGORIES = [
  "could_not_invite",
  "could_not_join",
  "could_not_choose_content",
  "provider_launch_problem",
  "manual_sync_confusion",
  "voice_problem",
  "chat_problem",
  "reconnect_problem",
  "other",
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_COMMENT_MAX = 400;

export interface FeedbackEntry {
  readonly outcome: FeedbackOutcome;
  readonly categories: readonly FeedbackCategory[];
  readonly comment: string | null;
  readonly at: string;
}

/**
 * Feedback is offered only once the room is over for this person: a finished
 * or closed room, or a session they abandoned. An active watch party is never
 * interrupted.
 */
export function shouldPromptFeedback(input: {
  readonly phase: RoomPhase;
  readonly hasLeft: boolean;
  readonly alreadyAnswered: boolean;
  readonly dismissed: boolean;
}): boolean {
  if (input.alreadyAnswered || input.dismissed) return false;
  if (input.hasLeft) return true;
  return input.phase === "ended" || input.phase === "closed";
}

export function isFeedbackCategory(value: string): value is FeedbackCategory {
  return (FEEDBACK_CATEGORIES as readonly string[]).includes(value);
}

export function buildFeedback(input: {
  readonly outcome: FeedbackOutcome;
  readonly categories: readonly string[];
  readonly comment?: string | null;
  readonly at?: string;
}): FeedbackEntry {
  const categories = input.categories.filter(isFeedbackCategory);
  const comment = (input.comment ?? "").trim();
  return {
    outcome: input.outcome,
    categories: [...new Set(categories)],
    comment: comment.length === 0 ? null : comment.slice(0, FEEDBACK_COMMENT_MAX),
    at: input.at ?? new Date().toISOString(),
  };
}

export function summarizeFeedback(entries: readonly FeedbackEntry[]): {
  readonly total: number;
  readonly byOutcome: Readonly<Record<FeedbackOutcome, number>>;
  readonly byCategory: Readonly<Record<string, number>>;
} {
  const byOutcome: Record<FeedbackOutcome, number> = { yes: 0, partly: 0, no: 0 };
  const byCategory: Record<string, number> = {};
  for (const entry of entries) {
    byOutcome[entry.outcome] += 1;
    for (const category of entry.categories) {
      byCategory[category] = (byCategory[category] ?? 0) + 1;
    }
  }
  return { total: entries.length, byOutcome, byCategory };
}
