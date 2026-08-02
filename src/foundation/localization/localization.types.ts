/**
 * Localization contracts — Sprint 1.0 §4.
 * Traceability: Foundation §16.2 (key grammar), §17 (normative localization).
 */
import type { LocaleCode } from "@/shared/constants/locales";

/** `<area>.<feature>.<element>.<variant>` — lowercase, dot-separated, ASCII. */
export type TranslationKey = string;

/** Flat key → string map. Flat by design: keys are data, not nested code paths. */
export type TranslationBundle = Readonly<Record<TranslationKey, string>>;

export interface LocaleBundle {
  readonly locale: LocaleCode;
  /** Bumped when strings change; the local-first cache keys on it (§18). */
  readonly version: string;
  readonly strings: TranslationBundle;
}

/** Interpolation values. Never used to assemble a sentence from fragments (§17). */
export type TranslationValues = Record<string, string | number>;

export const RESERVED_KEY_AREAS = [
  "common",
  "auth",
  "room",
  "invite",
  "sync",
  "voice",
  "provider",
  "compliance",
  "po",
  "settings",
  "notification",
  "error",
  "a11y",
] as const;
export type KeyArea = (typeof RESERVED_KEY_AREAS)[number];

const KEY_PATTERN = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;

export function isValidTranslationKey(key: string): boolean {
  if (!KEY_PATTERN.test(key)) return false;
  const area = key.split(".")[0] as KeyArea;
  return (RESERVED_KEY_AREAS as readonly string[]).includes(area);
}

export interface LocalizationService {
  readonly locale: LocaleCode;
  readonly direction: "ltr" | "rtl";
  /** Resolves a key, falling back to `en`, then to the key itself. */
  t(key: TranslationKey, values?: TranslationValues): string;
  /** CLDR plural category selection (Foundation §17). */
  plural(key: TranslationKey, count: number, values?: TranslationValues): string;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string;
}
