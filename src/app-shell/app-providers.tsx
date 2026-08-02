/**
 * Root provider composition — Sprint 1.0 §2.
 *
 * Order matters and is deliberate:
 *   Query → Accessibility → Localization → FeatureFlags → Po
 * Later providers may read earlier ones; never the reverse. Auth, Realtime,
 * Voice and Presence providers slot in below FeatureFlags in their own sprints.
 */
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { PoProvider } from "@/features/po";
import { AccessibilityProvider } from "@/foundation/accessibility";
import { FeatureFlagProvider } from "@/foundation/feature-flags";
import { LocalizationProvider } from "@/foundation/localization";

export function AppProviders({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        <LocalizationProvider>
          <FeatureFlagProvider>
            <PoProvider>{children}</PoProvider>
          </FeatureFlagProvider>
        </LocalizationProvider>
      </AccessibilityProvider>
    </QueryClientProvider>
  );
}
