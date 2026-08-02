/**
 * Authorization model — Sprint 1.4 §5/§6.
 *
 * Traceability: ADR-009 — platform privilege lives ONLY in `user_roles` and is
 * read through a security-definer function. It is never a column on a profile,
 * never read from client storage, and never trusted from the client.
 *
 * Room roles (`host`, `co_host`, `guest`) are membership attributes and are
 * deliberately absent here (ADR-009 consequences).
 */

/** Mirrors the `app_role` enum (Database Spec §5, ADR-009). */
export const APP_ROLES = ["admin", "moderator", "user"] as const;
export type AppRole = (typeof APP_ROLES)[number];

/**
 * Permission keys follow `<area>.<action>`. Sprint 1.4 declares only the
 * permissions the authentication module itself needs; a feature sprint adds
 * its own with the module that enforces them (Build Rules §21).
 */
export const PERMISSIONS = ["session.read", "session.revoke", "role.read"] as const;
export type Permission = (typeof PERMISSIONS)[number];

/**
 * Role → permission mapping. Data, not code branches: a new role or permission
 * is a table edit, never a conditional in a component.
 */
export const ROLE_PERMISSIONS: Readonly<Record<AppRole, readonly Permission[]>> = Object.freeze({
  admin: ["session.read", "session.revoke", "role.read"],
  moderator: ["session.read", "role.read"],
  user: ["session.read"],
});

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

/** Verdict shape. Presentation renders verdicts, never computes them (§2). */
export interface AuthorizationVerdict {
  readonly allowed: boolean;
  /** Present only when `allowed` is false; resolves under `error.auth.*`. */
  readonly reasonKey?: string;
}

export const ALLOWED: AuthorizationVerdict = Object.freeze({ allowed: true });

export function denied(reasonKey: string): AuthorizationVerdict {
  return Object.freeze({ allowed: false, reasonKey });
}
