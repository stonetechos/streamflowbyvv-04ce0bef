/**
 * Po Brain contracts — Milestone H1.
 *
 * The vocabulary shared by the intent engine, the conversation manager, the
 * planning engine and the executor. Nothing here knows how an intent is
 * detected or how a tool is implemented; these are the shapes those parts
 * exchange, so each can be reasoned about (and replaced) on its own.
 *
 * Traceability: ADR-001 §5–§9, Po Tool Registry v1.0 §1.
 */
import type { PoIntentCategory } from "../po.types";

/**
 * Every intent Po can recognise. An utterance that maps to none of these is
 * `unknown`, and Po says so rather than guessing (ADR-001 §5).
 */
export const PO_INTENT_NAMES = [
  // Rooms
  "room.create",
  "room.join_by_code",
  "room.leave",
  "room.close",
  "room.set_ready",
  "room.status",
  "room.list_recent",
  // Invitations
  "invite.create",
  "invite.list_pending",
  "invite.accept",
  "invite.decline",
  // Countdown
  "countdown.set_duration",
  "countdown.start",
  "countdown.cancel",
  // Providers
  "provider.list",
  "provider.select",
  // Voice
  "voice.join",
  "voice.leave",
  "voice.mute",
  "voice.unmute",
  // Synchronization
  "sync.status",
  "sync.resync",
  // Social
  "friend.list",
  "friend.search",
  "friend.request",
  "partners.list",
  // Profile and settings
  "settings.get",
  "settings.set",
  // Memory
  "memory.remember",
  "memory.list",
  "memory.forget",
  // Navigation and meta
  "navigate.to",
  "home.overview",
  "capability.list",
  "conversation.confirm",
  "conversation.decline",
  "conversation.cancel",
  "unknown",
] as const;

export type PoIntentName = (typeof PO_INTENT_NAMES)[number];

/** Extracted entities. Only primitives: a slot is data, never a live object. */
export type PoSlotValue = string | number | boolean;
export type PoSlots = Readonly<Record<string, PoSlotValue>>;

export interface PoResolvedIntent {
  readonly name: PoIntentName;
  readonly category: PoIntentCategory;
  /** 0–1. Below the act threshold Po asks instead of acting (ADR-001 §5). */
  readonly confidence: number;
  readonly slots: PoSlots;
  /** Required slots the utterance did not supply, in ask-order. */
  readonly missing: readonly string[];
  readonly utterance: string;
}

/** A localized line Po says. Po never emits raw prose from a call site. */
export interface PoMessage {
  readonly key: string;
  readonly values?: Readonly<Record<string, string | number>>;
}

export type PoTurnRole = "user" | "po";

export interface PoTurn {
  readonly id: string;
  readonly role: PoTurnRole;
  /** Present on user turns: exactly what was said. */
  readonly text?: string;
  /** Present on Po turns: what Po replied. */
  readonly message?: PoMessage;
  readonly intentName?: PoIntentName;
  readonly at: string;
}

/** One open question. Po holds at most one at a time (Milestone H1 §10). */
export interface PoPendingQuestion {
  readonly kind: "clarification" | "confirmation";
  readonly intent: PoResolvedIntent;
  /** The single slot being asked for, on a clarification. */
  readonly slot?: string;
  readonly message: PoMessage;
}

export type PoStepStatus = "ok" | "failed" | "blocked" | "skipped" | "cancelled";

export interface PoStepOutcome {
  readonly stepId: string;
  readonly toolName: string;
  readonly status: PoStepStatus;
  readonly output?: unknown;
  readonly errorCode?: string;
}

export type PoOutcomeStatus =
  "answered" | "executed" | "asked" | "refused" | "failed" | "cancelled";

export interface PoOutcome {
  readonly status: PoOutcomeStatus;
  readonly message: PoMessage;
  readonly steps: readonly PoStepOutcome[];
  /**
   * Milestone H1.5 §3 — one optional next thing worth offering, decided from
   * what just happened and what the room already looks like. It is a
   * suggestion, never an action: Po does nothing until it is asked.
   */
  readonly followUp?: PoMessage;
}

/**
 * Milestone H1.5 §5 — where a turn currently is. Reported as it changes so the
 * console can say "thinking" before it can say "running", rather than showing
 * one undifferentiated wait.
 */
export type PoExecutionPhase =
  | "thinking"
  | "planning"
  | "executing"
  | "awaiting_clarification"
  | "awaiting_confirmation"
  | "completed"
  | "cancelled"
  | "failed";

/**
 * A planned step. `bindings` carry a value produced by an earlier step into
 * this one, which is how a plan expresses dependency without a step ever
 * reaching for another step's result itself.
 */
export interface PoPlannedStep {
  readonly id: string;
  readonly toolName: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly requiresConfirmation: boolean;
  readonly bindings?: Readonly<Record<string, { readonly fromStep: string; readonly key: string }>>;
  /** Key of the line Po says when this step succeeds. */
  readonly replyKey: string;
}

export interface PoPlanned {
  readonly id: string;
  readonly intent: PoResolvedIntent;
  readonly steps: readonly PoPlannedStep[];
  readonly summaryKey: string;
  readonly summaryValues?: Readonly<Record<string, string | number>>;
}

/** A plan Po refuses to make, with the honest reason. */
export interface PoPlanRefusal {
  readonly refusalKey: string;
  readonly values?: Readonly<Record<string, string | number>>;
}

export type PoPlanResult =
  | { readonly kind: "plan"; readonly plan: PoPlanned }
  | {
      readonly kind: "clarify";
      readonly slot: string;
      readonly promptKey: string;
      /** Values the question interpolates, e.g. the names that both matched. */
      readonly values?: Readonly<Record<string, string | number>>;
    }
  | { readonly kind: "refuse"; readonly refusal: PoPlanRefusal };
