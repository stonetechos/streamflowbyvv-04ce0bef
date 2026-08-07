import { createFileRoute } from "@tanstack/react-router";

import { BetaDashboard } from "@/features/analytics/components/beta-dashboard";
import { RequireAuth } from "@/features/auth";

/**
 * Beta dashboard — Sprint H7.
 *
 * Internal only. The route is gated on the `admin` role so a beta participant
 * never lands on development instrumentation.
 */
export const Route = createFileRoute("/_authenticated/beta")({
  head: () => ({
    meta: [
      { title: "Beta dashboard — StreamFlow" },
      {
        name: "description",
        content: "Internal closed-beta funnel and reliability metrics for the StreamFlow team.",
      },
      { property: "og:title", content: "Beta dashboard — StreamFlow" },
      {
        property: "og:description",
        content: "Session-only development metrics for the StreamFlow closed beta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BetaRoute,
});

function BetaRoute() {
  return (
    <RequireAuth roles={["admin"]}>
      <BetaDashboard />
    </RequireAuth>
  );
}
