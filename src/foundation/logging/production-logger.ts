/**
 * Production logger — Sprint 1.0 §6.
 *
 * Emits one structured JSON line per record so any log collector can ingest it
 * without a vendor SDK. Errors are additionally handed to the error reporter,
 * which is itself an abstraction with a no-op default (Build Rules §23: no
 * hidden platform dependency).
 */
import type { ErrorReporter } from "./error-reporter";
import type { LogRecord, LogSink } from "./logger.types";

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (error == null) return undefined;
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: String(error) };
}

export function createProductionSink(reporter: ErrorReporter): LogSink {
  return {
    write(record) {
      const line = JSON.stringify({
        ts: record.timestamp,
        level: record.level,
        msg: record.message,
        correlationId: record.correlationId,
        ...record.context,
        err: serializeError(record.error),
      });

      if (record.level === "error") {
        console.error(line);
        reporter.captureError(record.error ?? new Error(record.message), record.context);
      } else if (record.level === "warn") {
        console.warn(line);
      } else {
        console.log(line);
      }
    },
  };
}
