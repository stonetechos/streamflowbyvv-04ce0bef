/**
 * HTTP error taxonomy — Sprint 1.1 §7, Foundation §16.1 (`SF-NET-*`).
 *
 * Every transport failure surfaces as an `AppError` with a localizable message
 * key, so no caller ever inspects a raw `fetch` rejection.
 */
import { AppError, type AppErrorDescriptor } from "@/shared/constants/error-taxonomy";

export const NETWORK_ERRORS = Object.freeze({
  TIMEOUT: {
    code: "SF-NET-TIMEOUT",
    messageKey: "error.net.timeout",
    severity: "error",
    retryable: true,
    recoveryActionKey: "error.action.retry",
  },
  OFFLINE: {
    code: "SF-NET-OFFLINE",
    messageKey: "error.net.offline",
    severity: "warning",
    retryable: true,
    recoveryActionKey: "error.action.retry",
  },
  CANCELLED: {
    code: "SF-NET-CANCELLED",
    messageKey: "error.net.cancelled",
    severity: "info",
    retryable: false,
  },
  UNREACHABLE: {
    code: "SF-NET-UNREACHABLE",
    messageKey: "error.net.unreachable",
    severity: "error",
    retryable: true,
    recoveryActionKey: "error.action.retry",
  },
  BAD_RESPONSE: {
    code: "SF-NET-BAD-RESPONSE",
    messageKey: "error.net.bad_response",
    severity: "error",
    retryable: false,
  },
  SERVER_ERROR: {
    code: "SF-NET-SERVER-ERROR",
    messageKey: "error.net.server_error",
    severity: "error",
    retryable: true,
    recoveryActionKey: "error.action.retry",
  },
  REQUEST_FAILED: {
    code: "SF-NET-REQUEST-FAILED",
    messageKey: "error.net.request_failed",
    severity: "error",
    retryable: false,
  },
}) satisfies Record<string, AppErrorDescriptor>;

export interface HttpErrorContext {
  readonly status?: number;
  readonly url: string;
  readonly method: string;
  readonly correlationId?: string;
  /** Parsed response body when one was received. Never logged verbatim. */
  readonly responseBody?: unknown;
}

export class HttpError extends AppError {
  constructor(
    descriptor: AppErrorDescriptor,
    readonly context: HttpErrorContext,
    options?: { cause?: unknown },
  ) {
    super(descriptor, options);
    this.name = "HttpError";
  }
}

/** Maps an HTTP status onto the taxonomy. Auth/domain mapping is not done here. */
export function descriptorForStatus(status: number): AppErrorDescriptor {
  if (status >= 500) return NETWORK_ERRORS.SERVER_ERROR;
  return NETWORK_ERRORS.REQUEST_FAILED;
}
