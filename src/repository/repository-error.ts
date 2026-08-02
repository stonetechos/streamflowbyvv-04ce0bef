/**
 * Repository errors — Sprint 1.1 §3, Foundation §16.1.
 *
 * Persistence failures are translated once, at the repository boundary, so no
 * vendor error type ever crosses into Domain (Foundation §2).
 */
import { AppError, type AppErrorDescriptor } from "@/shared/constants/error-taxonomy";

export const REPOSITORY_ERRORS = Object.freeze({
  UNAVAILABLE: {
    code: "SF-SYS-PERSISTENCE-UNAVAILABLE",
    messageKey: "error.sys.persistence_unavailable",
    severity: "error",
    retryable: true,
    recoveryActionKey: "error.action.retry",
  },
  QUERY_FAILED: {
    code: "SF-SYS-PERSISTENCE-FAILED",
    messageKey: "error.sys.persistence_failed",
    severity: "error",
    retryable: true,
    recoveryActionKey: "error.action.retry",
  },
  NOT_FOUND: {
    code: "SF-SYS-NOT-FOUND",
    messageKey: "error.sys.not_found",
    severity: "warning",
    retryable: false,
  },
  CONFLICT: {
    code: "SF-SYS-CONFLICT",
    messageKey: "error.sys.conflict",
    severity: "warning",
    retryable: false,
  },
  PERMISSION_DENIED: {
    code: "SF-SYS-PERMISSION-DENIED",
    messageKey: "error.sys.permission_denied",
    severity: "error",
    retryable: false,
  },
  CONSTRAINT_VIOLATION: {
    code: "SF-SYS-CONSTRAINT-VIOLATION",
    messageKey: "error.sys.constraint_violation",
    severity: "error",
    retryable: false,
  },
}) satisfies Record<string, AppErrorDescriptor>;

export interface RepositoryErrorContext {
  /** Aggregate name in domain terms, never a physical table name. */
  readonly aggregate: string;
  readonly operation: string;
  readonly entityId?: string;
}

export class RepositoryError extends AppError {
  constructor(
    descriptor: AppErrorDescriptor,
    readonly context: RepositoryErrorContext,
    options?: { cause?: unknown },
  ) {
    super(descriptor, options);
    this.name = "RepositoryError";
  }
}
