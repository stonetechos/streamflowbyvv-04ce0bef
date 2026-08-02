/**
 * Authentication domain models — Sprint 1.4 §1.
 *
 * Traceability: Foundation §2 (Domain is vendor-free), §3 (UserService owns
 * profiles; authentication is the identity edge in front of it), §10.3
 * (credentials are never stored by StreamFlow), MVP §3.1–§3.3 (email +
 * password and magic link are the only v1 methods).
 *
 * Nothing in this file knows that Supabase, Clerk, Auth0 or Firebase exist. An
 * Infrastructure adapter maps a vendor session onto these shapes; no vendor
 * type may appear here (Build Rules §18).
 */
import type { EntityCode, EntityId } from "@/repository";

/** Methods a v1 journey may use. No OAuth journey ships in v1 (MVP §3). */
export const AUTH_METHODS = ["email_password", "email_magic_link"] as const;
export type AuthMethod = (typeof AUTH_METHODS)[number];

/**
 * Lifecycle of the client's knowledge of a session. `unknown` is the honest
 * pre-resolution state and is never rendered as "signed out".
 */
export const SESSION_STATUSES = [
  "unknown",
  "authenticating",
  "authenticated",
  "unauthenticated",
  "expired",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/**
 * Opaque subject issued by whichever identity provider is plugged in. Maps to
 * `profiles.auth_user_id`, the single point of auth-provider coupling
 * (Database Spec §2).
 */
export type AuthSubjectId = string;

/** Identity as the domain understands it: a subject joined to a profile. */
export interface AuthIdentity {
  readonly subjectId: AuthSubjectId;
  readonly profileId: EntityId;
  readonly profileCode: EntityCode;
  readonly displayName: string;
  readonly handle: string;
  /** Mirrors `profile_status` (Database Spec §5). */
  readonly profileStatus: "active" | "suspended" | "deactivated" | "deleted";
  readonly emailVerified: boolean;
  readonly locale: string;
}

/**
 * A live session. Deliberately token-free: access and refresh material stay
 * inside the Infrastructure adapter and are never cached (Foundation §18
 * "Never cached", §10.1).
 */
export interface AuthSession {
  readonly identity: AuthIdentity;
  readonly method: AuthMethod;
  readonly issuedAt: string;
  /** ISO-8601. Absent when the provider issues a non-expiring session. */
  readonly expiresAt?: string;
}

export interface EmailPasswordCredentials {
  readonly method: "email_password";
  readonly email: string;
  readonly password: string;
}

export interface MagicLinkRequest {
  readonly method: "email_magic_link";
  readonly email: string;
  /** Same-origin path the provider returns the user to. Never a vendor URL. */
  readonly returnPath: string;
}

export type AuthCredentials = EmailPasswordCredentials | MagicLinkRequest;

export interface SignUpRequest {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly locale: string;
}

/** Result of an operation that may complete, or may need a second factor/step. */
export type AuthOutcome =
  | { readonly kind: "session"; readonly session: AuthSession }
  | { readonly kind: "verification_required"; readonly email: string }
  | { readonly kind: "magic_link_sent"; readonly email: string };

/** Immutable snapshot the Feature layer renders from. */
export interface AuthState {
  readonly status: SessionStatus;
  readonly session: AuthSession | null;
}

export const INITIAL_AUTH_STATE: AuthState = Object.freeze({
  status: "unknown",
  session: null,
});
