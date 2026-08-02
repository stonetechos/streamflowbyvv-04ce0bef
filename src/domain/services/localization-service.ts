/**
 * LocalizationService (Domain) — Foundation §3, §16, §17, Sprint 1.6.
 *
 * Business rules about locales and localization keys: which locale a profile
 * resolves to, and whether a key is well formed. String rendering stays in the
 * Foundation localization module; this service never holds copy.
 */
import { domainError } from "@/domain/errors/domain-errors";
import {
  FALLBACK_LOCALE,
  SUPPORTED_LOCALE_CODES,
  type LocaleCode,
} from "@/shared/constants/locales";

import type { DomainServiceContext } from "./service-context";

/** Foundation §16.2 — `<area>.<feature>.<element>.<variant>`, lowercase ASCII. */
const KEY_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*(?:\.[a-z0-9]+(?:_[a-z0-9]+)*)+$/;

export interface LocalizationDomainService {
  isSupported(locale: string): locale is LocaleCode;
  /** Profile preference wins, then the request locale, then the fallback. */
  resolveLocale(input: { profileLocale?: string | null; requestLocale?: string | null }): LocaleCode;
  isValidKey(key: string): boolean;
  assertValidKey(key: string): void;
  readonly supportedLocales: readonly LocaleCode[];
}

export function createLocalizationDomainService(
  _context: DomainServiceContext,
): LocalizationDomainService {
  const isSupported = (locale: string): locale is LocaleCode =>
    (SUPPORTED_LOCALE_CODES as readonly string[]).includes(locale);

  const isValidKey = (key: string): boolean => KEY_PATTERN.test(key);

  return {
    supportedLocales: SUPPORTED_LOCALE_CODES,
    isSupported,
    isValidKey,

    resolveLocale({ profileLocale, requestLocale }) {
      if (profileLocale && isSupported(profileLocale)) return profileLocale;
      if (requestLocale && isSupported(requestLocale)) return requestLocale;
      return FALLBACK_LOCALE;
    },

    assertValidKey(key) {
      if (!isValidKey(key)) {
        throw domainError("INVALID_INPUT", {
          operation: "LocalizationService.assertValidKey",
        });
      }
    },
  };
}
