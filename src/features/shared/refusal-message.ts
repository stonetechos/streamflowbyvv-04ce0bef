/**
 * Sprint J.1.5 — one place the Presentation layer turns a domain refusal into
 * a localization key.
 *
 * Presentation NEVER infers *why* something was refused; the domain already
 * decided and attached a stable `messageKey` to the error descriptor. This
 * helper only reads that decision, and falls back to a neutral key when the
 * failure is not a domain error at all (network, bug, unknown).
 */
import { AppError } from "@/shared/constants/error-taxonomy";
import type { TranslationKey } from "@/foundation/localization/localization.types";

/** Neutral fallback: used only when the domain gave us nothing to say. */
export const GENERIC_REFUSAL_KEY: TranslationKey = "error.sys.service_unavailable";

/** Reads the domain's own message key, or the neutral fallback. */
export function refusalMessageKey(
  error: unknown,
  fallback: TranslationKey = GENERIC_REFUSAL_KEY,
): TranslationKey {
  if (error instanceof AppError) {
    return error.descriptor.messageKey ?? fallback;
  }
  return fallback;
}

/** The stable domain code, when the caller needs to branch on it (rare). */
export function refusalCode(error: unknown): string | null {
  return error instanceof AppError ? error.code : null;
}
