/**
 * Theme provider — Milestone E.
 *
 * Owns one thing: which of the design system's two palettes is active, and how
 * that choice is reflected on `<html>`. Colour values themselves stay in
 * `styles.css`; nothing here knows a hex code.
 *
 * The choice is device-local (a phone may be dark while a desktop is light),
 * so it lives in local preferences rather than in server-side profile data.
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

import {
  LOCAL_PREFERENCE_KEYS,
  readLocalPreference,
  writeLocalPreference,
} from "@/foundation/preferences";

export const THEME_CHOICES = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

export interface ThemeContextValue {
  readonly theme: ThemeChoice;
  /** The palette actually rendering right now, after resolving `system`. */
  readonly resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeChoice(value: string | null): value is ThemeChoice {
  return value !== null && (THEME_CHOICES as readonly string[]).includes(value);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // SSR renders the default; the stored choice is applied after hydration so
  // server and client markup agree on the first pass.
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [systemDark, setSystemDark] = useState(true);

  useEffect(() => {
    const stored = readLocalPreference(LOCAL_PREFERENCE_KEYS.THEME);
    if (isThemeChoice(stored)) setThemeState(stored);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(query.matches);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    const element = document.documentElement;
    element.classList.toggle("dark", resolvedTheme === "dark");
    element.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    writeLocalPreference(LOCAL_PREFERENCE_KEYS.THEME, next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return context;
}
