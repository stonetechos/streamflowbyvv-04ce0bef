/**
 * Client-side form validation — Milestone E.
 *
 * Presentation-level courtesy only. Every rule here is also enforced by the
 * identity provider and, where it matters, by the Domain; this exists so a
 * person is told about an obvious mistake before a round trip, not to be the
 * authority on correctness (Build Rules §1).
 *
 * Validators return a translation key or `null`, never an English sentence, so
 * both launch locales are served from the same code path.
 */
import { MIN_PASSWORD_LENGTH } from "@/shared/constants/system-constants";

/**
 * Pragmatic address shape check. Deliberately permissive: rejecting an unusual
 * but valid address is a worse failure than accepting one the provider will
 * reject a moment later.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Room join codes are the human-readable entity code, e.g. `ROM-000001`. */
const ROOM_CODE_PATTERN = /^ROM-\d{6}$/i;

export type ValidationKey = string | null;

export function validateEmail(value: string): ValidationKey {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "auth.validation.email_required";
  if (!EMAIL_PATTERN.test(trimmed)) return "auth.validation.email_invalid";
  return null;
}

export function validatePassword(value: string): ValidationKey {
  if (value.length === 0) return "auth.validation.password_required";
  if (value.length < MIN_PASSWORD_LENGTH) return "auth.validation.password_too_short";
  return null;
}

export function validateDisplayName(value: string): ValidationKey {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "auth.validation.display_name_required";
  if (trimmed.length < 2) return "auth.validation.display_name_too_short";
  if (trimmed.length > 40) return "auth.validation.display_name_too_long";
  return null;
}

export function validateRoomCode(value: string): ValidationKey {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "room.validation.code_required";
  if (!ROOM_CODE_PATTERN.test(trimmed)) return "room.validation.code_invalid";
  return null;
}

/** Normalises a typed join code into the canonical stored form. */
export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Password strength, expressed as a coarse band for the meter. This is
 * guidance, not a gate: only `MIN_PASSWORD_LENGTH` is enforced.
 */
export type PasswordStrength = "weak" | "fair" | "strong";

export function passwordStrength(value: string): PasswordStrength {
  let score = 0;
  if (value.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (value.length >= 14) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^\w\s]/.test(value)) score += 1;

  if (score <= 2) return "weak";
  if (score <= 3) return "fair";
  return "strong";
}
