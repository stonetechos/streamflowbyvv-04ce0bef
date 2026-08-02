/**
 * Session serialization — Sprint 1.5 §5.
 *
 * A Domain `AuthSession` must be transportable (SSR handoff, diagnostics,
 * local-first hydration) WITHOUT ever carrying credential material. This module
 * is the only sanctioned serializer: it round-trips the Domain shape and
 * validates on the way back in, so a tampered payload fails closed rather than
 * producing a half-formed identity (Foundation §10.1, §18).
 *
 * Refresh tokens, access tokens and provider tokens are not accepted as input
 * and cannot appear in the output — they never reach this layer.
 */
import { AUTH_METHODS, type AuthMethod, type AuthSession } from "@/domain/auth/auth.types";

export const SESSION_SERIALIZATION_VERSION = 1 as const;

export interface SerializedAuthSession {
  readonly v: typeof SESSION_SERIALIZATION_VERSION;
  readonly subjectId: string;
  readonly profileId: string;
  readonly profileCode: string;
  readonly displayName: string;
  readonly handle: string;
  readonly profileStatus: AuthSession["identity"]["profileStatus"];
  readonly emailVerified: boolean;
  readonly locale: string;
  readonly method: AuthMethod;
  readonly issuedAt: string;
  readonly expiresAt?: string;
}

export function serializeSession(session: AuthSession): SerializedAuthSession {
  const { identity } = session;
  return {
    v: SESSION_SERIALIZATION_VERSION,
    subjectId: identity.subjectId,
    profileId: identity.profileId,
    profileCode: identity.profileCode,
    displayName: identity.displayName,
    handle: identity.handle,
    profileStatus: identity.profileStatus,
    emailVerified: identity.emailVerified,
    locale: identity.locale,
    method: session.method,
    issuedAt: session.issuedAt,
    ...(session.expiresAt ? { expiresAt: session.expiresAt } : {}),
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Returns `null` for anything that is not a well-formed serialized session. */
export function deserializeSession(input: unknown): AuthSession | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;

  if (raw["v"] !== SESSION_SERIALIZATION_VERSION) return null;
  if (
    !isString(raw["subjectId"]) ||
    !isString(raw["profileId"]) ||
    !isString(raw["profileCode"]) ||
    !isString(raw["displayName"]) ||
    !isString(raw["handle"]) ||
    !isString(raw["locale"]) ||
    !isString(raw["issuedAt"])
  ) {
    return null;
  }
  const method = raw["method"];
  if (!isString(method) || !(AUTH_METHODS as readonly string[]).includes(method)) return null;

  const status = raw["profileStatus"];
  if (
    status !== "active" &&
    status !== "suspended" &&
    status !== "deactivated" &&
    status !== "deleted"
  ) {
    return null;
  }

  const expiresAt = raw["expiresAt"];
  return {
    identity: {
      subjectId: raw["subjectId"],
      profileId: raw["profileId"],
      profileCode: raw["profileCode"],
      displayName: raw["displayName"],
      handle: raw["handle"],
      profileStatus: status,
      emailVerified: raw["emailVerified"] === true,
      locale: raw["locale"],
    },
    method: method as AuthMethod,
    issuedAt: raw["issuedAt"],
    ...(isString(expiresAt) ? { expiresAt } : {}),
  };
}
