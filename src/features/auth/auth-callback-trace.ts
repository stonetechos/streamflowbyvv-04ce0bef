/**
 * Callback trace + single-consumption guard — Sprint H1.7.
 *
 * The emailed link carries a one-time token. It must be handed to the identity
 * client exactly once: a second attempt is answered with "One-time token not
 * found" and is indistinguishable from a genuinely expired link.
 *
 * This module records the stages of the callback so a failure can be attributed
 * to the exact step, and holds the guard that makes token handling idempotent
 * across React Strict Mode double-invocation, remounts and re-renders.
 */
import { logger } from "@/foundation/logging";

export type CallbackStage =
  | "callback_entered"
  | "token_detected"
  | "no_token_present"
  | "provider_error"
  | "session_exchanged"
  | "profile_loaded"
  | "redirect"
  | "timed_out"
  | "duplicate_suppressed";

export interface CallbackTraceEntry {
  readonly stage: CallbackStage;
  readonly at: number;
  readonly detail?: string;
}

const trace: CallbackTraceEntry[] = [];

/** Fingerprints of link payloads this document has already handled. */
const handled = new Set<string>();

export function traceCallback(stage: CallbackStage, detail?: string): void {
  const entry: CallbackTraceEntry = { stage, at: Date.now(), ...(detail ? { detail } : {}) };
  trace.push(entry);
  logger.info(`auth.callback → ${stage}`, {
    module: "auth",
    operation: "callback",
    ...(detail ? { detail } : {}),
  });
}

export function readCallbackTrace(): readonly CallbackTraceEntry[] {
  return trace;
}

/**
 * Returns true the first time a given link payload is seen, false afterwards.
 * Never logs or stores the token itself — only a length/shape fingerprint.
 */
export function claimCallbackPayload(fingerprint: string): boolean {
  if (handled.has(fingerprint)) {
    traceCallback("duplicate_suppressed", fingerprint);
    return false;
  }
  handled.add(fingerprint);
  return true;
}

/** Test-support only. */
export function resetCallbackTrace(): void {
  trace.length = 0;
  handled.clear();
}
