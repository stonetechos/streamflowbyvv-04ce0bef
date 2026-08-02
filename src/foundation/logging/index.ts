/**
 * Logging composition root — Sprint 1.0 §6.
 * The rest of the application imports `logger` from here and nothing else.
 */
import { appConfig } from "@/config";

import { createDevSink } from "./dev-logger";
import { getErrorReporter } from "./error-reporter";
import {
  LEVEL_WEIGHT,
  redact,
  type LogContext,
  type LogRecord,
  type LogSink,
  type Logger,
} from "./logger.types";
import { createProductionSink } from "./production-logger";

function createLogger(sink: LogSink, baseContext: LogContext = {}): Logger {
  const threshold = LEVEL_WEIGHT[appConfig.logLevel];

  const emit = (
    level: LogRecord["level"],
    message: string,
    context?: LogContext,
    error?: unknown,
  ) => {
    if (LEVEL_WEIGHT[level] < threshold) return;
    const context_ = redact({ ...baseContext, ...context });
    sink.write({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context_ ? { context: context_ } : {}),
      ...(error === undefined ? {} : { error }),
    });
  };

  return {
    debug: (message, context) => emit("debug", message, context),
    info: (message, context) => emit("info", message, context),
    warn: (message, context) => emit("warn", message, context),
    error: (message, error, context) => emit("error", message, context, error),
    child: (context) => createLogger(sink, { ...baseContext, ...context }),
  };
}

const sink: LogSink = appConfig.isDevBuild
  ? createDevSink()
  : createProductionSink(getErrorReporter());

export const logger: Logger = createLogger(sink, { app: appConfig.appName });

export { setErrorReporter, getErrorReporter, noopErrorReporter } from "./error-reporter";
export type { ErrorReporter } from "./error-reporter";
export type { LogContext, Logger, LogRecord, LogSink } from "./logger.types";
