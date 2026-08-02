/**
 * Bundle registry — Sprint 1.0 §4.
 *
 * Adding a locale = adding a descriptor in `shared/constants/locales.ts` and a
 * bundle here. No component, route, or provider changes (Foundation §17).
 */
import type { LocaleCode } from "@/shared/constants/locales";

import type { LocaleBundle } from "../localization.types";

import { enBundle } from "./en";
import { hiINBundle } from "./hi-IN";

export const LOCALE_BUNDLES: Readonly<Record<LocaleCode, LocaleBundle>> = {
  en: enBundle,
  "hi-IN": hiINBundle,
};
