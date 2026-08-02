/**
 * Error taxonomy.
 *
 * Traceability: Foundation §16.1 — `SF-<DOMAIN>-<CONDITION>`, uppercase,
 * hyphen-separated, stable forever once shipped. Every error carries `code`,
 * `messageKey`, `severity`, `retryable`, and an optional `recoveryActionKey`.
 *
 * Sprint 1.0 declares the grammar and the shell-level codes only. Domain codes
 * ship with the module that raises them (Foundation §13, Build Rules §21).
 */

export const ERROR_DOMAINS = [
  "AUTH",
  "ROOM",
  "INVITE",
  "SYNC",
  "VOICE",
  "PROVIDER",
  "COMPLIANCE",
  "PO",
  "NET",
  "SYS",
] as const;
export type ErrorDomain = (typeof ERROR_DOMAINS)[number];

export const ERROR_SEVERITIES = ["info", "warning", "error", "fatal"] as const;
export type ErrorSeverity = (typeof ERROR_SEVERITIES)[number];

export type ErrorCode = `SF-${ErrorDomain}-${string}`;

export interface AppErrorDescriptor {
  readonly code: ErrorCode;
  /** Resolves under `error.*` (Foundation §16.2), 1:1 with the code. */
  readonly messageKey: string;
  readonly severity: ErrorSeverity;
  readonly retryable: boolean;
  readonly recoveryActionKey?: string;
}

const CODE_PATTERN = /^SF-(AUTH|ROOM|INVITE|SYNC|VOICE|PROVIDER|COMPLIANCE|PO|NET|SYS)-[A-Z0-9-]+$/;

export function isValidErrorCode(code: string): code is ErrorCode {
  return CODE_PATTERN.test(code);
}

/** Application error carrying the full descriptor. Never renders raw text. */
export class AppError extends Error {
  readonly descriptor: AppErrorDescriptor;

  constructor(descriptor: AppErrorDescriptor, options?: { cause?: unknown }) {
    super(descriptor.code, options);
    this.name = "AppError";
    this.descriptor = descriptor;
  }

  get code(): ErrorCode {
    return this.descriptor.code;
  }
}

/**
 * Shell-level system errors owned by Sprint 1.0. Feature sprints add their own
 * descriptors next to the module that raises them — never by widening this map.
 */
export const SYSTEM_ERRORS = Object.freeze({
  UNEXPECTED: {
    code: "SF-SYS-UNEXPECTED",
    messageKey: "error.sys.unexpected",
    severity: "error",
    retryable: true,
    recoveryActionKey: "error.action.retry",
  },
  ROUTE_NOT_FOUND: {
    code: "SF-SYS-ROUTE-NOT-FOUND",
    messageKey: "error.sys.route_not_found",
    severity: "warning",
    retryable: false,
    recoveryActionKey: "error.action.go_home",
  },
  CONFIG_INVALID: {
    code: "SF-SYS-CONFIG-INVALID",
    messageKey: "error.sys.config_invalid",
    severity: "fatal",
    retryable: false,
  },
}) satisfies Record<string, AppErrorDescriptor>;
