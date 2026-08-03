/**
 * Auth form submission state — Milestone E.
 *
 * Every authentication form has the same three-state life: idle, in flight,
 * finished with a verdict. Expressing that once removes the copy-pasted
 * `useState` triads and, more importantly, makes error presentation uniform:
 * a failure always surfaces as a translation key drawn from the error
 * taxonomy, never as a raw provider string (Foundation §16.1).
 */
import { useCallback, useState } from "react";

import { AUTH_ERRORS } from "@/domain/auth";
import { logger } from "@/foundation/logging";

export interface AuthFormState {
  readonly pending: boolean;
  /** Translation key for the failure, or null. */
  readonly errorKey: string | null;
  /** Error code shown to support, e.g. `SF-AUTH-INVALID-CREDENTIALS`. */
  readonly errorCode: string | null;
}

const IDLE: AuthFormState = Object.freeze({ pending: false, errorKey: null, errorCode: null });

interface TaxonomyShaped {
  readonly messageKey?: unknown;
  readonly code?: unknown;
  /** Taxonomy errors carry their descriptor rather than spreading it. */
  readonly descriptor?: { readonly messageKey?: unknown; readonly code?: unknown };
}

/**
 * Maps anything thrown into a message key. Unrecognised failures are reported
 * as the provider being unavailable, which is the honest reading: we asked the
 * identity provider a question and did not get an answer we understand.
 */
export function toAuthErrorPresentation(error: unknown): {
  errorKey: string;
  errorCode: string;
} {
  const candidate = error as TaxonomyShaped | null;
  const descriptor = candidate?.descriptor;
  const messageKey =
    typeof candidate?.messageKey === "string"
      ? candidate.messageKey
      : typeof descriptor?.messageKey === "string"
        ? descriptor.messageKey
        : null;
  const code =
    typeof candidate?.code === "string"
      ? candidate.code
      : typeof descriptor?.code === "string"
        ? descriptor.code
        : null;

  if (messageKey && code) return { errorKey: messageKey, errorCode: code };

  return {
    errorKey: AUTH_ERRORS.PROVIDER_UNAVAILABLE.messageKey,
    errorCode: AUTH_ERRORS.PROVIDER_UNAVAILABLE.code,
  };
}


export interface UseAuthFormResult extends AuthFormState {
  /** Runs `action`, tracking pending state and capturing any failure. */
  submit: <T>(action: () => Promise<T>) => Promise<T | null>;
  clearError: () => void;
}

export function useAuthForm(): UseAuthFormResult {
  const [state, setState] = useState<AuthFormState>(IDLE);

  const submit = useCallback(async <T>(action: () => Promise<T>): Promise<T | null> => {
    setState({ pending: true, errorKey: null, errorCode: null });
    try {
      const result = await action();
      setState(IDLE);
      return result;
    } catch (error) {
      const presentation = toAuthErrorPresentation(error);
      // Never log the address or password — only the taxonomy code.
      logger.warn("Authentication action failed", {
        module: "auth",
        code: presentation.errorCode,
      });
      setState({ pending: false, ...presentation });
      return null;
    }
  }, []);

  const clearError = useCallback(() => setState(IDLE), []);

  return { ...state, submit, clearError };
}
