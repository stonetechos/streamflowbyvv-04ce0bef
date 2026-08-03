/**
 * Root provider composition — Sprint 1.0 §2, extended in Sprint 1.4.
 *
 * Order matters and is deliberate:
 *   Query → Theme → Accessibility → Localization → FeatureFlags → Auth → Po
 * Later providers may read earlier ones; never the reverse. Auth sits below
 * FeatureFlags (it registers its own flag) and above Po, which will one day
 * need to know who is speaking. Realtime, Voice and Presence slot in below Auth
 * in their own sprints.
 */
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { AuthProvider } from "@/features/auth";
import { PoProvider } from "@/features/po";
import { AccessibilityProvider } from "@/foundation/accessibility";
import { FeatureFlagProvider } from "@/foundation/feature-flags";
import { LocalizationProvider } from "@/foundation/localization";
import { ThemeProvider } from "@/foundation/theme";

import { composeApplication } from "./composition-root";

// Sprint 1.5 §9: bind adapters to contracts before the first render, so the
// auth provider resolves a real session repository on mount.
composeApplication();

export function AppProviders({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AccessibilityProvider>
          <LocalizationProvider>
            <FeatureFlagProvider>
              <AuthProvider>
                <PoProvider>{children}</PoProvider>
              </AuthProvider>
            </FeatureFlagProvider>
          </LocalizationProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
