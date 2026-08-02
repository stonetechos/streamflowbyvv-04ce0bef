/**
 * Auth state machine — Sprint 1.4 §8.
 *
 * Pure reducer: no I/O, no vendor, no React. The Feature provider owns the
 * effects; this file owns the legal transitions, so state can be reasoned about
 * and tested in isolation (Foundation §2).
 */
import type { AuthSession, AuthState, SessionStatus } from "@/domain/auth";
import { INITIAL_AUTH_STATE } from "@/domain/auth";

export type AuthAction =
  | { type: "resolve_started" }
  | { type: "resolved"; session: AuthSession | null }
  | { type: "authenticating" }
  | { type: "authenticated"; session: AuthSession }
  | { type: "signed_out" }
  | { type: "expired" }
  | { type: "failed" };

export const initialAuthState: AuthState = INITIAL_AUTH_STATE;

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "resolve_started":
      return state.status === "authenticated" ? state : { status: "unknown", session: null };
    case "resolved":
      return action.session
        ? { status: "authenticated", session: action.session }
        : { status: "unauthenticated", session: null };
    case "authenticating":
      return { status: "authenticating", session: null };
    case "authenticated":
      return { status: "authenticated", session: action.session };
    case "signed_out":
      return { status: "unauthenticated", session: null };
    case "expired":
      return { status: "expired", session: null };
    case "failed":
      return { status: "unauthenticated", session: null };
    default:
      return state;
  }
}

/** Only these two statuses may render protected content. */
export function isSettled(status: SessionStatus): boolean {
  return status !== "unknown" && status !== "authenticating";
}
