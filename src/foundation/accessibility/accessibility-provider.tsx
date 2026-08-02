/**
 * Accessibility provider — Sprint 1.0 §7.
 *
 * Owns three things and nothing else:
 *  1. resolved preferences (OS defaults, overridable),
 *  2. their reflection onto `<html>` data attributes consumed by `styles.css`,
 *  3. a single application-wide live region (WCAG 2.1 AA, MVP §12).
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
  FONT_SCALE_RANGE,
  type AccessibilityPreferences,
  type AriaLivePoliteness,
  type ContrastMode,
} from "./accessibility.types";

export interface AccessibilityContextValue extends AccessibilityPreferences {
  /** Resolved value after applying the OS setting when the override is null. */
  readonly prefersReducedMotion: boolean;
  setReducedMotion: (value: boolean | null) => void;
  setContrast: (mode: ContrastMode) => void;
  setFontScale: (scale: number) => void;
  /** Announces a message to assistive technology via the shared live region. */
  announce: (message: string, politeness?: AriaLivePoliteness) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

const clampFontScale = (scale: number) =>
  Math.min(FONT_SCALE_RANGE.MAX, Math.max(FONT_SCALE_RANGE.MIN, scale));

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const [contrast, setContrast] = useState<ContrastMode>("default");
  const [fontScale, setFontScaleState] = useState(1);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystemReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setSystemReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const prefersReducedMotion = reducedMotion ?? systemReducedMotion;

  useEffect(() => {
    const element = document.documentElement;
    element.dataset["contrast"] = contrast;
    element.dataset["reducedMotion"] = String(prefersReducedMotion);
    element.style.setProperty("--font-scale", String(fontScale));
    return () => {
      element.style.removeProperty("--font-scale");
    };
  }, [contrast, prefersReducedMotion, fontScale]);

  const announce = useCallback((message: string, politeness: AriaLivePoliteness = "polite") => {
    const setter = politeness === "assertive" ? setAssertiveMessage : setPoliteMessage;
    // Clear first so repeated identical messages are re-announced.
    setter("");
    window.requestAnimationFrame(() => setter(message));
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      reducedMotion,
      prefersReducedMotion,
      contrast,
      fontScale,
      setReducedMotion,
      setContrast,
      setFontScale: (scale: number) => setFontScaleState(clampFontScale(scale)),
      announce,
    }),
    [announce, contrast, fontScale, prefersReducedMotion, reducedMotion],
  );

  return (
    <AccessibilityContext value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {politeMessage}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertiveMessage}
      </div>
    </AccessibilityContext>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const context = use(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within <AccessibilityProvider>");
  }
  return context;
}

/** Announce-only hook for components that do not need preference state. */
export function useAnnouncer() {
  return useAccessibility().announce;
}
