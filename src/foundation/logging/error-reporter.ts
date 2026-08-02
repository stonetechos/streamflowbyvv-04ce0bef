/**
 * Error reporting abstraction — Sprint 1.0 §6.
 *
 * One interface, one adapter (Build Rules §25). Sprint 1.0 ships the no-op
 * adapter only; wiring a real provider is a single `setErrorReporter` call and
 * touches no application code.
 */
import type { LogContext } from "./logger.types";

export interface ErrorReporter {
  captureError(error: unknown, context?: LogContext): void;
  captureMessage(message: string, context?: LogContext): void;
  /** Opaque identifier only — never PII (Foundation §9, analytics rules). */
  setUser(anonymousId: string | null): void;
}

export const noopErrorReporter: ErrorReporter = {
  captureError: () => undefined,
  captureMessage: () => undefined,
  setUser: () => undefined,
};

let activeReporter: ErrorReporter = noopErrorReporter;

export function setErrorReporter(reporter: ErrorReporter): void {
  activeReporter = reporter;
}

export function getErrorReporter(): ErrorReporter {
  return activeReporter;
}
