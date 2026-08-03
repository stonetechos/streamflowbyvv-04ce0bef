/**
 * Localization service — Sprint 1.0 §4.
 *
 * Pure, framework-free implementation: the React provider is a thin wrapper so
 * the same resolution logic can be reused outside the Presentation layer.
 */
import { FALLBACK_LOCALE, getLocaleDescriptor, type LocaleCode } from "@/shared/constants/locales";

import { LOCALE_BUNDLES } from "./bundles";
import type { LocalizationService, TranslationKey, TranslationValues } from "./localization.types";

const INTERPOLATION = /\{(\w+)\}/g;

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template;
  return template.replace(INTERPOLATION, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

export interface MissingKeyHandler {
  (key: TranslationKey, locale: LocaleCode): void;
}

export function createLocalizationService(
  locale: LocaleCode,
  onMissingKey?: MissingKeyHandler,
): LocalizationService {
  const descriptor = getLocaleDescriptor(locale);
  const primary = LOCALE_BUNDLES[locale]?.strings ?? {};
  const fallback = LOCALE_BUNDLES[FALLBACK_LOCALE].strings;

  const lookup = (key: TranslationKey): string => {
    const value = primary[key] ?? fallback[key];
    if (value === undefined) {
      onMissingKey?.(key, locale);
      // The key itself is the last resort: never invent user-facing copy.
      return key;
    }
    return value;
  };

  const pluralRules = new Intl.PluralRules(locale);

  return {
    locale,
    direction: descriptor.direction,
    t: (key, values) => interpolate(lookup(key), values),
    plural: (key, count, values) => {
      const category = pluralRules.select(count);
      const candidate = `${key}_${category}`;
      const resolved = primary[candidate] ?? fallback[candidate];
      const template = resolved ?? lookup(`${key}_other`);
      return interpolate(template, { count, ...values });
    },
    formatNumber: (value, options) => new Intl.NumberFormat(locale, options).format(value),
    formatDate: (value, options) => new Intl.DateTimeFormat(locale, options).format(value),
    formatRelativeTime: (value, unit) =>
      new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit),
  };
}
