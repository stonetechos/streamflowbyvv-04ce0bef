/**
 * Po Conversation Manager — Milestone H1 §2.
 *
 * Owns the shape of a conversation: the turns that happened, the one question
 * Po is waiting on, and the slots carried between turns. It holds no
 * capability and calls nothing; the brain asks it what state the conversation
 * is in and tells it what happened next.
 *
 * Rules it enforces:
 * - at most one open question at a time (Milestone H1 §10);
 * - a new instruction interrupts an open question rather than queueing behind
 *   it, because a person who changes their mind should not have to answer the
 *   old question first;
 * - "cancel" always wins, and always clears everything in flight.
 */
import type {
  PoMessage,
  PoPendingQuestion,
  PoResolvedIntent,
  PoSlots,
  PoTurn,
} from "./po-brain.types";

/** Turns retained in a session. Older turns fall off; nothing is persisted. */
const MAX_TURNS = 40;

export interface PoConversationState {
  readonly turns: readonly PoTurn[];
  readonly pending: PoPendingQuestion | null;
  /** Slots gathered across the current exchange, cleared when it resolves. */
  readonly carriedSlots: PoSlots;
  /** The last intent Po acted on, for continuation ("and invite Ana too"). */
  readonly lastIntent: PoResolvedIntent | null;
}

export const EMPTY_CONVERSATION: PoConversationState = Object.freeze({
  turns: [],
  pending: null,
  carriedSlots: {},
  lastIntent: null,
});

function turnId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `turn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function append(turns: readonly PoTurn[], turn: PoTurn): readonly PoTurn[] {
  const next = [...turns, turn];
  return next.length > MAX_TURNS ? next.slice(next.length - MAX_TURNS) : next;
}

export function recordUserTurn(state: PoConversationState, text: string): PoConversationState {
  return {
    ...state,
    turns: append(state.turns, { id: turnId(), role: "user", text, at: new Date().toISOString() }),
  };
}

export function recordPoTurn(
  state: PoConversationState,
  message: PoMessage,
  intent?: PoResolvedIntent,
): PoConversationState {
  const turn: PoTurn = {
    id: turnId(),
    role: "po",
    message,
    at: new Date().toISOString(),
    ...(intent ? { intentName: intent.name } : {}),
  };
  return { ...state, turns: append(state.turns, turn) };
}

/** Opens the single question Po is waiting on, replacing any earlier one. */
export function askQuestion(
  state: PoConversationState,
  question: PoPendingQuestion,
): PoConversationState {
  return {
    ...state,
    pending: question,
    carriedSlots: { ...state.carriedSlots, ...question.intent.slots },
  };
}

/** Applies an answer to the open clarification, returning the fuller intent. */
export function answerPending(
  state: PoConversationState,
  value: string,
): { readonly state: PoConversationState; readonly intent: PoResolvedIntent } | null {
  const pending = state.pending;
  if (!pending || pending.kind !== "clarification" || !pending.slot) return null;

  const slots: PoSlots = { ...pending.intent.slots, [pending.slot]: value };
  const intent: PoResolvedIntent = {
    ...pending.intent,
    slots,
    missing: pending.intent.missing.filter((name) => name !== pending.slot),
  };
  return { state: { ...state, pending: null, carriedSlots: slots }, intent };
}

export function clearPending(state: PoConversationState): PoConversationState {
  return { ...state, pending: null };
}

/** An exchange finished: nothing is outstanding and nothing carries over. */
export function settle(
  state: PoConversationState,
  intent: PoResolvedIntent | null,
): PoConversationState {
  return { ...state, pending: null, carriedSlots: {}, lastIntent: intent };
}

/** Cancellation: the conversation keeps its history and loses everything else. */
export function cancelExchange(state: PoConversationState): PoConversationState {
  return { ...state, pending: null, carriedSlots: {}, lastIntent: null };
}

export function hasOpenQuestion(state: PoConversationState): boolean {
  return state.pending !== null;
}

export function isConfirmationPending(state: PoConversationState): boolean {
  return state.pending?.kind === "confirmation";
}

export function resetConversation(): PoConversationState {
  return EMPTY_CONVERSATION;
}
