/**
 * Po Intent Engine — Milestone H1 §1.
 *
 * Turns an utterance into a named intent with extracted entities, a confidence
 * score and the list of parameters it still lacks. It decides nothing about
 * what should happen next: planning, clarification and execution are separate
 * stages, so a misread here can never become an action (ADR-001 §5).
 *
 * Scoring is deterministic and explainable:
 *   base            0.50  a rule matched at all
 * + coverage        0.30  how much of the sentence the match accounted for
 * + slots           0.15  every required entity was actually found
 * + continuity      0.05  the intent continues the conversation in progress
 *
 * Nothing is inferred beyond what was said. A missing entity is reported as
 * missing; it is never invented (Milestone H1 §3, §10).
 */
import type { PoIntentCategory } from "../po.types";
import {
  PO_INTENT_RULES,
  normalizeUtterance,
  type IntentRule,
} from "./po-lexicon";
import type { PoIntentName, PoResolvedIntent, PoSlots } from "./po-brain.types";

/** At or above this Po may act. */
export const PO_ACT_THRESHOLD = 0.6;
/** Between this and the act threshold Po confirms its reading first. */
export const PO_CLARIFY_THRESHOLD = 0.35;

export interface PoIntentContext {
  /** Intent of the turn Po is still resolving, if any. */
  readonly pendingIntent?: PoIntentName | null;
  /** Slots carried over from the conversation so far. */
  readonly carriedSlots?: PoSlots;
}

const UNKNOWN_CATEGORY: PoIntentCategory = "unknown";

function coverage(text: string, match: RegExpExecArray): number {
  const matched = match[0]?.length ?? 0;
  if (text.length === 0) return 0;
  return Math.min(1, matched / text.length);
}

interface RuleMatch {
  readonly rule: IntentRule;
  readonly coverage: number;
  readonly slots: PoSlots;
}

function evaluateRule(rule: IntentRule, text: string): RuleMatch | null {
  let best: RegExpExecArray | null = null;
  for (const pattern of rule.patterns) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}`;
    const match = new RegExp(pattern.source, flags).exec(text);
    if (match && (!best || match[0].length > best[0].length)) best = match;
  }
  if (!best) return null;
  return { rule, coverage: coverage(text, best), slots: rule.extract?.(text) ?? {} };
}

function missingSlots(rule: IntentRule, slots: PoSlots): readonly string[] {
  return (rule.required ?? []).filter((name) => slots[name] === undefined);
}

/**
 * Resolves one utterance. Returns `unknown` with zero confidence when nothing
 * matches — the honest answer, and the one that makes Po say it cannot help
 * rather than attempt something adjacent.
 */
export function detectIntent(utterance: string, context: PoIntentContext = {}): PoResolvedIntent {
  const text = normalizeUtterance(utterance);
  if (text.length === 0) {
    return {
      name: "unknown",
      category: UNKNOWN_CATEGORY,
      confidence: 0,
      slots: {},
      missing: [],
      utterance: text,
    };
  }

  const matches: RuleMatch[] = [];
  for (const rule of PO_INTENT_RULES) {
    const evaluated = evaluateRule(rule, text);
    if (evaluated) matches.push(evaluated);
  }

  if (matches.length === 0) {
    return {
      name: "unknown",
      category: UNKNOWN_CATEGORY,
      confidence: 0,
      slots: {},
      missing: [],
      utterance: text,
    };
  }

  const scored = matches.map((candidate) => {
    const merged: PoSlots = { ...(context.carriedSlots ?? {}), ...candidate.slots };
    const required = candidate.rule.required ?? [];
    const satisfied = required.every((name) => merged[name] !== undefined);
    const continuity = context.pendingIntent === candidate.rule.name ? 0.05 : 0;
    const score =
      0.5 + candidate.coverage * 0.3 + (required.length > 0 && satisfied ? 0.15 : 0) + continuity;
    return { candidate, merged, score: Math.min(0.98, score) };
  });

  scored.sort((a, b) => b.score - a.score || b.candidate.coverage - a.candidate.coverage);
  const winner = scored[0];
  if (!winner) {
    return {
      name: "unknown",
      category: UNKNOWN_CATEGORY,
      confidence: 0,
      slots: {},
      missing: [],
      utterance: text,
    };
  }

  // Only slots this intent declares are carried forward; an unrelated leftover
  // value must never silently become a parameter of the next action.
  const declared = new Set(winner.candidate.rule.required ?? []);
  const ownSlots: Record<string, PoSlots[string]> = { ...winner.candidate.slots };
  for (const name of declared) {
    const carried = context.carriedSlots?.[name];
    if (ownSlots[name] === undefined && carried !== undefined) ownSlots[name] = carried;
  }

  return {
    name: winner.candidate.rule.name,
    category: winner.candidate.rule.category,
    confidence: winner.score,
    slots: ownSlots,
    missing: missingSlots(winner.candidate.rule, ownSlots),
    utterance: text,
  };
}

/**
 * Splits a compound instruction into the parts Po should handle in order.
 * Only splits where both halves independently read as instructions, so
 * "invite Rishi and Ana" stays one invitation.
 */
export function splitUtterance(utterance: string): readonly string[] {
  const text = normalizeUtterance(utterance);
  const parts = text
    .split(/\s*(?:,\s*)?(?:and then|then|after that|;)\s+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length < 2) return [text];

  const allRecognised = parts.every((part) => detectIntent(part).confidence >= PO_ACT_THRESHOLD);
  return allRecognised ? parts : [text];
}

export function isActionable(intent: PoResolvedIntent): boolean {
  return intent.name !== "unknown" && intent.confidence >= PO_ACT_THRESHOLD;
}

export function needsInterpretationCheck(intent: PoResolvedIntent): boolean {
  return (
    intent.name !== "unknown" &&
    intent.confidence >= PO_CLARIFY_THRESHOLD &&
    intent.confidence < PO_ACT_THRESHOLD
  );
}
