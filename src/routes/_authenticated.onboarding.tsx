import { createFileRoute } from "@tanstack/react-router";

import { useAuth } from "@/features/auth";
import { OnboardingWizard } from "@/features/profiles";

/**
 * Onboarding — Milestone E.
 *
 * First-run setup. It lives inside the protected subtree because a profile
 * must exist before it can be described.
 */
export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your profile — StreamFlow" },
      {
        name: "description",
        content: "Choose your name, language, services and accessibility preferences.",
      },
      { property: "og:title", content: "Set up your profile — StreamFlow" },
      {
        property: "og:description",
        content: "A short first-run setup before your first watch party.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingRoute,
});

function OnboardingRoute() {
  const auth = useAuth();
  const identity = auth.session?.identity ?? null;

  return (
    <OnboardingWizard
      profileId={identity?.profileId ?? null}
      initialName={identity?.displayName ?? ""}
    />
  );
}
