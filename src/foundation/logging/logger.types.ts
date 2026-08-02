/**
 * Logging foundation — Sprint 1.0 §6.
 *
 * Contract only. `logger` is the single import surface for the application;
 * the concrete sink is selected once, at composition time, by
 * `src/foundation/logging/index.ts`.
 */
import type { LogLevel } from "@/config";

export type LogContext = Record<string, unknown>;

export interface LogRecord {
  readonly level: Exclude<LogLevel, "silent">;
  readonly message: string;
  readonly context?: LogContext;
  readonly error?: unknown;
  readonly timestamp: string;
  /** Correlates a log line with a domain event chain when one exists. */
  readonly correlationId?: string;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
  /** Returns a logger that merges `context` into every record it emits. */
  child(context: LogContext): Logger;
}

export interface LogSink {
  write(record: LogRecord): void;
}

export const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

/**
 * Keys whose values are never written to a log, in any environment.
 * Foundation §10 / §18: tokens and credentials leave no trace.
 */
const REDACTED_KEYS = [
  "token",
  "access_token",
  "refresh_token",
  "password",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "credential",
];

export function redact(context: LogContext | undefined): LogContext | undefined {
  if (!context) return undefined;
  const output: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    output[key] = REDACTED_KEYS.some((needle) => key.toLowerCase().includes(needle))
      ? "[redacted]"
      : value;
  }
  return output;
}
