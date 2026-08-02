/**
 * Po Core contracts — Sprint 1.0 §8, per ADR-001.
 *
 * Architecture shell ONLY. No LLM adapter, no planner, no execution. What ships
 * here is the shape Po will occupy so later sprints add capability without
 * reshaping the module (Build Rules §2).
 */

/** ADR-001 §5: Po never acts on an unrecognised intent. */
export const PO_INTENT_CATEGORIES = [
  "room_control",
  "invitation",
  "playback_sync",
  "voice_control",
  "provider_action",
  "settings",
  "informational",
  "unknown",
] as const;
export type PoIntentCategory = (typeof PO_INTENT_CATEGORIES)[number];

export type PoSessionStatus = "idle" | "listening" | "interpreting" | "planning" | "awaiting_confirmation" | "executing" | "error";

export interface PoUtterance {
  readonly text: string;
  readonly source: "text" | "voice";
  readonly receivedAt: string;
}

export interface PoIntent {
  readonly category: PoIntentCategory;
  readonly confidence: number;
  readonly parameters: Readonly<Record<string, unknown>>;
}

/** A single executable unit of a plan, always bound to a registered tool. */
export interface PoPlanStep {
  readonly id: string;
  readonly toolName: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly requiresConfirmation: boolean;
}

export interface PoPlan {
  readonly id: string;
  readonly intent: PoIntent;
  readonly steps: readonly PoPlanStep[];
  /** Plain-language summary shown before execution (ADR-001 §7). */
  readonly summary: string;
}

/** ADR-001 §9: every tool declares its compliance and confirmation posture. */
export interface PoToolDescriptor<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly category: PoIntentCategory;
  /** Must pass a ComplianceService check before execution. */
  readonly requiresComplianceCheck: boolean;
  /** Must be confirmed by the user before execution. */
  readonly requiresConfirmation: boolean;
  /** Validates and narrows raw model output; throws on invalid input. */
  parseInput(raw: unknown): TInput;
  execute(input: TInput): Promise<TOutput>;
}

export interface PoPromptDescriptor {
  readonly id: string;
  readonly version: string;
  readonly description: string;
  /** Prompt text is versioned data, never inlined at a call site (ADR-001 §8). */
  readonly template: string;
}
