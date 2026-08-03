/**
 * Po Tool Executor — Milestone H1 §5.
 *
 * Runs a plan, one step at a time, and reports what actually happened. It is
 * deliberately unclever: it does not retry, does not substitute a different
 * tool, and does not continue past a failure. If step two depended on step one
 * and step one failed, the remaining steps are reported as skipped rather than
 * attempted against a state that no longer matches the plan.
 *
 * Three gates run before any tool executes (ADR-001 §9, §10):
 * 1. the tool must be registered — Po cannot call what it was never given;
 * 2. the input must parse — a tool refuses malformed input rather than
 *    coercing it;
 * 3. a compliance-gated tool must pass the Domain's verdict, which the Domain
 *    itself issues; the executor only refuses to proceed without one.
 */
import { logger } from "@/foundation/logging";
import { DomainError } from "@/domain";

import { getPoTool } from "../tool-registry";
import type { PoPlanned, PoStepOutcome } from "./po-brain.types";
import { PoToolInputError, PoToolUnavailableError } from "./tool-catalog";

const MODULE = "po-executor";

export interface PoExecutionResult {
  readonly steps: readonly PoStepOutcome[];
  readonly failed: boolean;
  /** Output of the last successful step, used to phrase the reply. */
  readonly lastOutput: unknown;
  /** Reply key of the last successful step. */
  readonly lastReplyKey: string | null;
  /** Set when a step failed, so the reply can name the reason. */
  readonly failureKey: string | null;
}

/** Maps a thrown error to the line Po says. Unknown errors stay generic. */
function failureKeyFor(cause: unknown): string {
  if (cause instanceof PoToolInputError) return "po.fail.invalid_input";
  if (cause instanceof PoToolUnavailableError) {
    switch (cause.capability) {
      case "signed_in":
        return "po.refuse.signed_out";
      case "live_room":
        return "po.refuse.no_room";
      case "voice":
      case "voice_connection":
        return "po.fail.voice_unavailable";
      case "memory_opt_in":
        return "po.refuse.memory_off";
      case "countdown_not_ready":
        return "po.refuse.sync_not_ready";
      case "navigation":
        return "po.fail.navigation_unavailable";
      default:
        return "po.fail.unavailable";
    }
  }
  if (cause instanceof DomainError) {
    switch (cause.code) {
      case "SF-ROOM-CAPACITY-EXCEEDED":
        return "po.fail.room_full";
      case "SF-ROOM-FORBIDDEN":
      case "SF-SYS-FRIENDSHIP-FORBIDDEN":
        return "po.refuse.host_only";
      case "SF-ROOM-NOT-FOUND":
        return "po.fail.room_not_found";
      case "SF-ROOM-ALREADY-MEMBER":
        return "po.fail.already_member";
      case "SF-INVITE-NOT-FOUND":
      case "SF-INVITE-EXPIRED":
      case "SF-INVITE-NOT-PENDING":
        return "po.fail.invite_gone";
      case "SF-COMPLIANCE-ACTION-BLOCKED":
      case "SF-PROVIDER-CAPABILITY-UNSUPPORTED":
        return "po.refuse.provider_blocked_generic";
      case "SF-SYNC-RESYNC-REQUIRED":
        return "po.refuse.sync_not_ready";
      case "SF-SYNC-COUNTDOWN-OUT-OF-RANGE":
        return "po.fail.invalid_input";
      case "SF-SYS-SERVICE-UNAVAILABLE":
        return "po.fail.unavailable";
      case "SF-SYS-RATE-LIMITED":
        return "po.fail.rate_limited";
      default:
        return "po.fail.generic";
    }
  }
  return "po.fail.generic";
}

export async function executePoPlan(plan: PoPlanned): Promise<PoExecutionResult> {
  const steps: PoStepOutcome[] = [];
  const outputs = new Map<string, unknown>();
  let failed = false;
  let failureKey: string | null = null;
  let lastOutput: unknown = null;
  let lastReplyKey: string | null = null;

  for (const planned of plan.steps) {
    if (failed) {
      steps.push({ stepId: planned.id, toolName: planned.toolName, status: "skipped" });
      continue;
    }

    const tool = getPoTool(planned.toolName);
    if (!tool) {
      // Structurally impossible unless a plan names a tool that was never
      // registered; Po must not silently do nothing.
      failed = true;
      failureKey = "po.fail.unavailable";
      steps.push({ stepId: planned.id, toolName: planned.toolName, status: "blocked" });
      logger.warn("Po planned an unregistered tool", { module: MODULE, tool: planned.toolName });
      continue;
    }

    // Dependency: a value produced earlier is carried in, never fetched again.
    const bound: Record<string, unknown> = { ...planned.input };
    for (const [field, binding] of Object.entries(planned.bindings ?? {})) {
      const source = outputs.get(binding.fromStep);
      if (typeof source === "object" && source !== null) {
        bound[field] = (source as Record<string, unknown>)[binding.key];
      }
    }

    try {
      const input = tool.parseInput(bound as never);
      const output = await tool.execute(input as never);
      outputs.set(planned.id, output);
      lastOutput = output;
      lastReplyKey = planned.replyKey;
      steps.push({ stepId: planned.id, toolName: planned.toolName, status: "ok", output });
    } catch (cause) {
      failed = true;
      failureKey = failureKeyFor(cause);
      const status = cause instanceof PoToolUnavailableError ? "blocked" : "failed";
      steps.push({
        stepId: planned.id,
        toolName: planned.toolName,
        status,
        ...(cause instanceof DomainError ? { errorCode: cause.code } : {}),
      });
      logger.warn("Po step failed", {
        module: MODULE,
        tool: planned.toolName,
        error: cause,
      });
    }
  }

  return { steps, failed, lastOutput, lastReplyKey, failureKey };
}

/** True when any step in the plan must be confirmed before it runs. */
export function planNeedsConfirmation(plan: PoPlanned): boolean {
  return plan.steps.some((planned) => {
    const tool = getPoTool(planned.toolName);
    return planned.requiresConfirmation || tool?.requiresConfirmation === true;
  });
}
