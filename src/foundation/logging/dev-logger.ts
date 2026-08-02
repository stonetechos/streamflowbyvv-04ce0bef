/**
 * Development logger — Sprint 1.0 §6.
 * Human-readable console output. Never used in a production bundle.
 */
import type { LogRecord, LogSink } from "./logger.types";

const LEVEL_STYLE: Record<LogRecord["level"], string> = {
  debug: "color:#8aa",
  info: "color:#4ba",
  warn: "color:#d90",
  error: "color:#e55",
};

export function createDevSink(): LogSink {
  return {
    write(record) {
      const prefix = `%c[${record.level.toUpperCase()}]`;
      const args: unknown[] = [`${prefix} ${record.message}`, LEVEL_STYLE[record.level]];
      if (record.context) args.push(record.context);
      if (record.error) args.push(record.error);

      if (record.level === "error") console.error(...args);
      else if (record.level === "warn") console.warn(...args);
      else console.log(...args);
    },
  };
}
