/**
 * Locale constants.
 *
 * Traceability: Foundation §17 (normative). Launch locales for v1.0 are English
 * (`en`) and Hindi (`hi-IN`). Locales are DATA, never code branches: adding a
 * locale means adding a descriptor and a bundle, never editing a component.
 */

export interface LocaleDescriptor {
  /** BCP-47 tag. Never a fixed database enum (Foundation §17). */
  readonly code: string;
  /** Name in the locale's own language, used in the language switcher. */
  readonly nativeName: string;
  readonly englishName: string;
  readonly direction: "ltr" | "rtl";
}

export const SUPPORTED_LOCALES = [
  { code: "en", nativeName: "English", englishName: "English", direction: "ltr" },
  { code: "hi-IN", nativeName: "हिन्दी", englishName: "Hindi", direction: "ltr" },
] as const satisfies readonly LocaleDescriptor[];

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]["code"];

/** Fallback chain terminates here for any missing key (MVP §13). */
export const DEFAULT_LOCALE: LocaleCode = "en";
export const FALLBACK_LOCALE: LocaleCode = "en";

export const SUPPORTED_LOCALE_CODES: readonly LocaleCode[] = SUPPORTED_LOCALES.map((l) => l.code);

export function isSupportedLocale(value: string): value is LocaleCode {
  return SUPPORTED_LOCALE_CODES.includes(value as LocaleCode);
}

export function getLocaleDescriptor(code: LocaleCode): LocaleDescriptor {
  return SUPPORTED_LOCALES.find((locale) => locale.code === code) ?? SUPPORTED_LOCALES[0];
}

/**
 * Resolves an arbitrary tag (e.g. from `navigator.language`) onto a supported
 * locale by exact match, then by primary subtag, then the default.
 */
export function resolveLocale(candidate: string | null | undefined): LocaleCode {
  if (!candidate) return DEFAULT_LOCALE;
  if (isSupportedLocale(candidate)) return candidate;
  const primary = candidate.split("-")[0]?.toLowerCase();
  const match = SUPPORTED_LOCALE_CODES.find(
    (code) => code.split("-")[0]?.toLowerCase() === primary,
  );
  return match ?? DEFAULT_LOCALE;
}
