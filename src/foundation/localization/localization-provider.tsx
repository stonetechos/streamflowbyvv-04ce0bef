/**
 * Localization provider — Sprint 1.0 §4.
 *
 * Runtime locale switching with no page reload (MVP §13). The chosen locale is
 * held in memory and mirrored to `<html lang>` / `<html dir>` so direction-aware
 * layout works from the first commit. Persisting the choice to
 * `localization_preferences` belongs to the Settings module, not this sprint.
 */
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { logger } from "@/foundation/logging";
import {
  SUPPORTED_LOCALES,
  isSupportedLocale,
  resolveLocale,
  type LocaleCode,
  type LocaleDescriptor,
} from "@/shared/constants/locales";
import { appConfig } from "@/config";

import { createLocalizationService } from "./localization-service";
import type { LocalizationService } from "./localization.types";

export interface LocalizationContextValue extends LocalizationService {
  setLocale: (locale: LocaleCode) => void;
  readonly availableLocales: readonly LocaleDescriptor[];
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export interface LocalizationProviderProps {
  children: ReactNode;
  /** Overrides detection. Used by tests and by SSR-provided preferences later. */
  initialLocale?: LocaleCode;
}

export function LocalizationProvider({ children, initialLocale }: LocalizationProviderProps) {
  // SSR renders the default locale; detection runs after hydration so server
  // and client markup always agree.
  const [locale, setLocaleState] = useState<LocaleCode>(initialLocale ?? appConfig.defaultLocale);

  useEffect(() => {
    if (initialLocale) return;
    const detected = resolveLocale(navigator.language);
    setLocaleState((current) => (current === detected ? current : detected));
  }, [initialLocale]);

  useEffect(() => {
    const element = document.documentElement;
    element.lang = locale;
    element.dir = SUPPORTED_LOCALES.find((l) => l.code === locale)?.direction ?? "ltr";
  }, [locale]);

  const setLocale = useCallback((next: LocaleCode) => {
    if (!isSupportedLocale(next)) {
      logger.warn("Ignored unsupported locale", { requested: next });
      return;
    }
    setLocaleState(next);
  }, []);

  const value = useMemo<LocalizationContextValue>(() => {
    const service = createLocalizationService(locale, (key, activeLocale) => {
      logger.warn("Missing translation key", { key, locale: activeLocale });
    });
    return { ...service, setLocale, availableLocales: SUPPORTED_LOCALES };
  }, [locale, setLocale]);

  return <LocalizationContext value={value}>{children}</LocalizationContext>;
}

export function useLocalization(): LocalizationContextValue {
  const context = use(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used within <LocalizationProvider>");
  }
  return context;
}

/** Convenience hook for the common case: `const { t } = useTranslation()`. */
export function useTranslation() {
  const { t, plural, formatNumber, formatDate, formatRelativeTime, locale, direction } =
    useLocalization();
  return { t, plural, formatNumber, formatDate, formatRelativeTime, locale, direction };
}
