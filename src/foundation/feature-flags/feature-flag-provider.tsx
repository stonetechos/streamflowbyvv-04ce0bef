/**
 * Feature flag provider — Sprint 1.0 §5.
 *
 * Exposes evaluation to the Presentation layer. It holds no product rules; the
 * only decision it makes is "which definitions and which subject".
 */
import { createContext, use, useMemo, type ReactNode } from "react";

import { evaluateFlag } from "./feature-flag-evaluator";
import { featureFlagRegistry } from "./feature-flag-registry";
import type { FlagEvaluation, FlagSubject } from "./feature-flags.types";

export interface FeatureFlagContextValue {
  isEnabled: (key: string) => boolean;
  evaluate: (key: string) => FlagEvaluation;
  readonly subject: FlagSubject | null;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

export interface FeatureFlagProviderProps {
  children: ReactNode;
  /** Null until an identity module exists; percentage/targeted then resolve off. */
  subject?: FlagSubject | null;
}

export function FeatureFlagProvider({ children, subject = null }: FeatureFlagProviderProps) {
  const value = useMemo<FeatureFlagContextValue>(
    () => ({
      subject,
      evaluate: (key) => evaluateFlag(featureFlagRegistry.get(key), subject),
      isEnabled: (key) => evaluateFlag(featureFlagRegistry.get(key), subject).enabled,
    }),
    [subject],
  );

  return <FeatureFlagContext value={value}>{children}</FeatureFlagContext>;
}

export function useFeatureFlags(): FeatureFlagContextValue {
  const context = use(FeatureFlagContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within <FeatureFlagProvider>");
  }
  return context;
}

export function useFeatureFlag(key: string): boolean {
  return useFeatureFlags().isEnabled(key);
}
