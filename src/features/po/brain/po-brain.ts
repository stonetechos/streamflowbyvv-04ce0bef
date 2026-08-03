/**
 * Po Brain — Milestone H1.
 *
 * The orchestrator: it takes what a person said and returns what Po says back,
 * plus the new state of the conversation. Every stage it uses lives elsewhere
 * — detection, planning, execution, memory — so this file only decides the
 * order things happen in and what Po does when a stage says "I can't".
 *
 * The order is fixed and never skipped:
 *   understand → check confidence → plan → clarify or confirm → execute → say
 *
 * Po answers a question or asks one. It never does both, and it never acts on
 * an intent it could not name (ADR-001 §5).
 */
import { logger } from "@/foundation/logging";

import {
  EMPTY_CONVERSATION,
  answerPending,
  askQuestion,
  cancelExchange,
  recordPoTurn,
  recordUserTurn,
  settle,
  type PoConversationState,
} from "./conversation-manager";
import { PO_CLARIFY_THRESHOLD, detectIntent, isActionable, splitUtterance } from "./intent-engine";
import { planIntent } from "./planning-engine";
import { followUpFor } from "./po-followups";
import { getPoRuntime } from "./po-runtime";
import type {
  PoExecutionPhase,
  PoMessage,
  PoOutcome,
  PoPlanned,
  PoResolvedIntent,
  PoStepOutcome,
} from "./po-brain.types";
import { executePoPlan, planNeedsConfirmation } from "./tool-executor";

const MODULE = "po-brain";

export interface PoBrainState {
  readonly conversation: PoConversationState;
  /** A plan waiting on a yes. Held whole, so nothing runs before the yes. */
  readonly pendingPlan: PoPlanned | null;
  /**
   * Milestone H1.5 §3 — the last suggestion Po made, so the same one is not
   * offered twice in a row.
   */
  readonly lastFollowUpKey: string | null;
}

export const EMPTY_BRAIN_STATE: PoBrainState = Object.freeze({
  conversation: EMPTY_CONVERSATION,
  pendingPlan: null,
  lastFollowUpKey: null,
});

/** Reports where the turn is. Milestone H1.5 §5 — feedback, not behaviour. */
export type PoPhaseReporter = (phase: PoExecutionPhase) => void;

const NO_PHASES: PoPhaseReporter = () => {};

export interface PoBrainResult {
  readonly state: PoBrainState;
  readonly outcome: PoOutcome;
}

function message(key: string, values?: Record<string, string | number>): PoMessage {
  return values ? { key, values } : { key };
}

/**
 * Turns a tool's output into the values a reply line can interpolate. Only
 * primitives survive; a list becomes a readable joined string, because Po
 * speaks in sentences rather than in data.
 */
function replyValues(output: unknown): Record<string, string | number> {
  if (typeof output !== "object" || output === null) return {};
  const values: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(output as Record<string, unknown>)) {
    if (typeof value === "string" || typeof value === "number") values[key] = value;
    else if (typeof value === "boolean") values[key] = value ? "yes" : "no";
    else if (Array.isArray(value)) {
      values[key] = value.filter((entry) => typeof entry === "string").join(", ");
    }
  }
  return values;
}

function outcome(
  status: PoOutcome["status"],
  msg: PoMessage,
  steps: readonly PoStepOutcome[] = [],
): PoOutcome {
  return { status, message: msg, steps };
}

/** Runs a plan and phrases the result. Confirmation is decided before here. */
async function runPlan(
  state: PoBrainState,
  intent: PoResolvedIntent,
  plan: PoPlanned,
  onPhase: PoPhaseReporter = NO_PHASES,
): Promise<PoBrainResult> {
  onPhase("executing");
  const execution = await executePoPlan(plan);

  const msg = execution.failed
    ? message(execution.failureKey ?? "po.fail.generic")
    : message(execution.lastReplyKey ?? "po.done.generic", {
        ...(plan.summaryValues ?? {}),
        ...replyValues(execution.lastOutput),
      });

  const nextConversation = recordPoTurn(settle(state.conversation, intent), msg, intent);
  const status: PoOutcome["status"] = execution.failed
    ? execution.failureKey?.startsWith("po.refuse.")
      ? "refused"
      : "failed"
    : intent.category === "informational"
      ? "answered"
      : "executed";

  // Milestone H1.5 §3 — one offer, only when the situation makes it useful,
  // and never the same offer twice running.
  let followUp: PoMessage | null = null;
  if (!execution.failed) {
    followUp = await followUpFor(intent, getPoRuntime().actor.profileId);
    if (followUp && followUp.key === state.lastFollowUpKey) followUp = null;
  }

  onPhase(execution.failed ? "failed" : "completed");

  return {
    state: {
      conversation: nextConversation,
      pendingPlan: null,
      lastFollowUpKey: followUp?.key ?? null,
    },
    outcome: {
      ...outcome(status, msg, execution.steps),
      ...(followUp ? { followUp } : {}),
    },
  };
}

/** Plans one intent, then either asks, refuses, confirms, or executes. */
async function handleIntent(
  state: PoBrainState,
  intent: PoResolvedIntent,
  onPhase: PoPhaseReporter = NO_PHASES,
): Promise<PoBrainResult> {
  onPhase("planning");
  const planned = await planIntent(intent);

  if (planned.kind === "clarify") {
    onPhase("awaiting_clarification");
    // The question may name what it found, e.g. both people called Rahul.
    const msg = message(planned.promptKey, {
      ...(intent.slots as Record<string, string | number>),
      ...(planned.values ?? {}),
    });
    const conversation = recordPoTurn(
      askQuestion(state.conversation, {
        kind: "clarification",
        intent,
        slot: planned.slot,
        message: msg,
      }),
      msg,
      intent,
    );
    return {
      state: { ...state, conversation, pendingPlan: null },
      outcome: outcome("asked", msg),
    };
  }

  if (planned.kind === "refuse") {
    onPhase("failed");
    const msg = message(planned.refusal.refusalKey, planned.refusal.values);
    const conversation = recordPoTurn(settle(state.conversation, intent), msg, intent);
    return {
      state: { ...state, conversation, pendingPlan: null },
      outcome: outcome("refused", msg),
    };
  }

  const plan = planned.plan;

  if (planNeedsConfirmation(plan)) {
    onPhase("awaiting_confirmation");
    const msg = message(`${plan.summaryKey}.confirm`, plan.summaryValues);
    const conversation = recordPoTurn(
      askQuestion(state.conversation, { kind: "confirmation", intent, message: msg }),
      msg,
      intent,
    );
    return {
      state: { ...state, conversation, pendingPlan: plan },
      outcome: outcome("asked", msg),
    };
  }

  return runPlan(state, intent, plan, onPhase);
}

/**
 * The single entry point. Everything a person types arrives here, including
 * the answer to a question Po asked, which is why the open question is checked
 * before the utterance is read as a new instruction.
 */
export async function handlePoUtterance(
  state: PoBrainState,
  utterance: string,
  onPhase: PoPhaseReporter = NO_PHASES,
): Promise<PoBrainResult> {
  onPhase("thinking");
  const said = utterance.trim();
  if (said.length === 0) {
    return { state, outcome: outcome("asked", message("po.ask.repeat")) };
  }

  const heard: PoBrainState = { ...state, conversation: recordUserTurn(state.conversation, said) };
  const pending = state.conversation.pending;
  const reading = detectIntent(said, {
    pendingIntent: pending?.intent.name ?? null,
    carriedSlots: state.conversation.carriedSlots,
  });

  // Cancellation always wins, at any point in an exchange.
  if (reading.name === "conversation.cancel") {
    onPhase("cancelled");
    const msg = message("po.done.cancelled");
    return {
      state: {
        ...state,
        conversation: recordPoTurn(cancelExchange(heard.conversation), msg),
        pendingPlan: null,
      },
      outcome: outcome("cancelled", msg),
    };
  }

  // A plan waiting on a yes.
  if (pending?.kind === "confirmation" && state.pendingPlan) {
    if (reading.name === "conversation.confirm") {
      return runPlan(heard, pending.intent, state.pendingPlan, onPhase);
    }
    if (reading.name === "conversation.decline") {
      onPhase("cancelled");
      const msg = message("po.done.cancelled");
      return {
        state: {
          ...state,
          conversation: recordPoTurn(cancelExchange(heard.conversation), msg),
          pendingPlan: null,
        },
        outcome: outcome("cancelled", msg),
      };
    }
    // Anything else replaces the pending action rather than queueing behind it.
    logger.debug("Po confirmation interrupted", { module: MODULE });
  }

  // An answer to a question Po asked. Treated as the answer unless it clearly
  // reads as a new instruction, so "Ana" is a name and not a failed match.
  if (pending?.kind === "clarification" && !isActionable(reading)) {
    const answered = answerPending({ ...heard.conversation }, said);
    if (answered) {
      return handleIntent({ ...heard, conversation: answered.state }, answered.intent, onPhase);
    }
  }

  // A compound instruction is handled one part at a time, in order, and stops
  // at the first part that needs an answer or cannot be done.
  const parts = splitUtterance(said);
  if (parts.length > 1) {
    let current = heard;
    let last: PoBrainResult | null = null;
    const steps: PoStepOutcome[] = [];
    for (const part of parts) {
      const partIntent = detectIntent(part, { carriedSlots: current.conversation.carriedSlots });
      last = await handleIntent(current, partIntent, onPhase);
      current = last.state;
      steps.push(...last.outcome.steps);
      if (last.outcome.status !== "executed" && last.outcome.status !== "answered") break;
    }
    if (last) {
      return { state: last.state, outcome: { ...last.outcome, steps } };
    }
  }

  if (reading.name === "unknown" || reading.confidence < PO_CLARIFY_THRESHOLD) {
    onPhase("failed");
    const msg = message("po.refuse.unknown");
    return {
      state: {
        ...state,
        conversation: recordPoTurn(settle(heard.conversation, null), msg),
        pendingPlan: null,
      },
      outcome: outcome("refused", msg),
    };
  }

  return handleIntent(heard, reading, onPhase);
}

/** Clears the conversation. Nothing was persisted, so nothing is deleted. */
export function resetPoBrain(): PoBrainState {
  return EMPTY_BRAIN_STATE;
}
