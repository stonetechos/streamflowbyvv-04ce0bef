/**
 * Authentication mapper — Sprint 1.5 §7.
 *
 * The single place a vendor session becomes a Domain session. Nothing above
 * Infrastructure ever sees a `User`, a `Session`, or an access token
 * (Foundation §2, §10.1; Build Rules §18).
 *
 * Token material is deliberately dropped here rather than carried and ignored:
 * what is never mapped can never leak.
 */
import type { AuthError as VendorAuthError, Session, User } from "@supabase/supabase-js";

import { authError, type AuthError, type AuthErrorKey } from "@/domain/auth/auth-errors";
import type {
  AuthIdentity,
  AuthMethod,
  AuthSession,
  AuthSubjectId,
} from "@/domain/auth/auth.types";
import { isAppRole, type AppRole } from "@/domain/auth/authorization.types";

import type { TableRow } from "../supabase.types";

export type ProfileRow = Pick<
  TableRow<"profiles">,
  "id" | "code" | "display_name" | "handle" | "status" | "locale"
>;

/** Columns the auth adapter reads. Nothing wider ever crosses the boundary. */
export const PROFILE_IDENTITY_COLUMNS = "id, code, display_name, handle, status, locale";

const PROFILE_STATUSES = ["active", "suspended", "deactivated", "deleted"] as const;
type ProfileStatus = (typeof PROFILE_STATUSES)[number];

function toProfileStatus(value: string): ProfileStatus {
  return (PROFILE_STATUSES as readonly string[]).includes(value)
    ? (value as ProfileStatus)
    : "deactivated";
}

/**
 * Infers the Domain auth method from the provider's authentication references.
 * Falls back to `email_password`, the only other v1 method (MVP §3).
 */
export function toAuthMethod(session: Session): AuthMethod {
  const amr = (session.user.app_metadata as { amr?: unknown } | undefined)?.amr;
  const methods = Array.isArray(amr)
    ? amr.map((entry) => String((entry as { method?: unknown })?.method ?? entry))
    : [];
  return methods.some((method) => method === "otp" || method === "magiclink")
    ? "email_magic_link"
    : "email_password";
}

export function toSubjectId(user: User): AuthSubjectId {
  return user.id;
}

export function toIdentity(user: User, profile: ProfileRow): AuthIdentity {
  return {
    subjectId: user.id,
    profileId: profile.id,
    profileCode: profile.code,
    displayName: profile.display_name,
    handle: profile.handle,
    profileStatus: toProfileStatus(profile.status),
    emailVerified: Boolean(user.email_confirmed_at ?? user.confirmed_at),
    locale: profile.locale,
  };
}

/** Vendor session + profile row → Domain session. Token-free by construction. */
export function toAuthSession(session: Session, profile: ProfileRow): AuthSession {
  const issuedAtSeconds =
    typeof session.expires_at === "number" && typeof session.expires_in === "number"
      ? session.expires_at - session.expires_in
      : undefined;

  return {
    identity: toIdentity(session.user, profile),
    method: toAuthMethod(session),
    issuedAt: new Date((issuedAtSeconds ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    ...(typeof session.expires_at === "number"
      ? { expiresAt: new Date(session.expires_at * 1000).toISOString() }
      : {}),
  };
}

export function toAppRoles(rows: readonly { role: string }[]): readonly AppRole[] {
  return rows.map((row) => row.role).filter(isAppRole);
}

/**
 * Vendor auth failure → Domain error taxonomy. The vendor message is never
 * forwarded: it can disclose whether an address is registered.
 */
export function toAuthError(
  error: VendorAuthError | { status?: number; code?: string; message?: string },
  operation: string,
): AuthError {
  const status = "status" in error ? error.status : undefined;
  const code = typeof error.code === "string" ? error.code : "";
  const message = (error.message ?? "").toLowerCase();

  let key: AuthErrorKey = "PROVIDER_UNAVAILABLE";
  if (
    status === 429 ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit"
  ) {
    key = "RATE_LIMITED";
  } else if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    key = "EMAIL_NOT_VERIFIED";
  } else if (code === "user_banned") {
    key = "ACCOUNT_SUSPENDED";
  } else if (code === "session_not_found" || code === "refresh_token_not_found") {
    key = "SESSION_EXPIRED";
  } else if (status === 400 || status === 401 || code === "invalid_credentials") {
    key = "INVALID_CREDENTIALS";
  }

  return authError(key, { operation }, { cause: error });
}
