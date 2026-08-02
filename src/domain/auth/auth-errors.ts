/**
 * Authentication error taxonomy — Sprint 1.4 §9.
 *
 * Traceability: Foundation §16.1 — `SF-AUTH-<CONDITION>`, every error carrying
 * `code`, `messageKey`, `severity`, `retryable` and an optional
 * `recoveryActionKey`. Each `messageKey` resolves 1:1 under `error.auth.*`
 * (Foundation §16.2) and exists in both launch bundles from this commit.
 */
import { AppError, type AppErrorDescriptor } from "@/shared/constants/error-taxonomy";

export const AUTH_ERRORS = Object.freeze({
  /** No identity adapter is bound. The v1.4 default, by design. */
  PROVIDER_UNAVAILABLE: {
    code: "SF-AUTH-PROVIDER-UNAVAILABLE",
    messageKey: "error.auth.provider_unavailable",
    severity: "error",
    retryable: false,
  },
  INVALID_CREDENTIALS: {
    code: "SF-AUTH-INVALID-CREDENTIALS",
    messageKey: "error.auth.invalid_credentials",
    severity: "warning",
    retryable: true,
    recoveryActionKey: "auth.action.reset_password",
  },
  EMAIL_NOT_VERIFIED: {
    code: "SF-AUTH-EMAIL-NOT-VERIFIED",
    messageKey: "error.auth.email_not_verified",
    severity: "warning",
    retryable: false,
    recoveryActionKey: "auth.action.resend_verification",
  },
  SESSION_EXPIRED: {
    code: "SF-AUTH-SESSION-EXPIRED",
    messageKey: "error.auth.session_expired",
    severity: "warning",
    retryable: false,
    recoveryActionKey: "auth.action.sign_in",
  },
  SESSION_MISSING: {
    code: "SF-AUTH-SESSION-MISSING",
    messageKey: "error.auth.session_missing",
    severity: "warning",
    retryable: false,
    recoveryActionKey: "auth.action.sign_in",
  },
  ACCOUNT_SUSPENDED: {
    code: "SF-AUTH-ACCOUNT-SUSPENDED",
    messageKey: "error.auth.account_suspended",
    severity: "error",
    retryable: false,
  },
  PERMISSION_DENIED: {
    code: "SF-AUTH-PERMISSION-DENIED",
    messageKey: "error.auth.permission_denied",
    severity: "error",
    retryable: false,
    recoveryActionKey: "error.action.go_home",
  },
  RATE_LIMITED: {
    code: "SF-AUTH-RATE-LIMITED",
    messageKey: "error.auth.rate_limited",
    severity: "warning",
    retryable: true,
    recoveryActionKey: "error.action.retry",
  },
  SIGN_OUT_FAILED: {
    code: "SF-AUTH-SIGN-OUT-FAILED",
    messageKey: "error.auth.sign_out_failed",
    severity: "error",
    retryable: true,
    recoveryActionKey: "error.action.retry",
  },
}) satisfies Record<string, AppErrorDescriptor>;

export type AuthErrorKey = keyof typeof AUTH_ERRORS;

export interface AuthErrorContext {
  readonly operation: string;
  /** Never an email, token, or password — logging redacts, taxonomy omits. */
  readonly subjectId?: string;
}

export class AuthError extends AppError {
  readonly context: AuthErrorContext;

  constructor(
    descriptor: AppErrorDescriptor,
    context: AuthErrorContext,
    options?: { cause?: unknown },
  ) {
    super(descriptor, options);
    this.name = "AuthError";
    this.context = context;
  }
}

export function authError(
  key: AuthErrorKey,
  context: AuthErrorContext,
  options?: { cause?: unknown },
): AuthError {
  return new AuthError(AUTH_ERRORS[key], context, options);
}
