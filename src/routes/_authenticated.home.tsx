import { createFileRoute } from "@tanstack/react-router";

import { useAuth } from "@/features/auth";
import { HomeScreen, useHome } from "@/features/home";

/**
 * Home — Milestone E.
 *
 * The signed-in landing surface. All reads come from `useHome`, which projects
 * the `HomeReadModel` snapshot; the route only supplies identity.
 */
export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — StreamFlow" },
      {
        name: "description",
        content:
          "Resume a watch party, answer invitations, or start a synchronized session with the people you watch with.",
      },
      { property: "og:title", content: "Home — StreamFlow" },
      {
        property: "og:description",
        content: "Your watch parties, invitations and services in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeRoute,
});

function HomeRoute() {
  const auth = useAuth();
  const identity = auth.session?.identity ?? null;
  const home = useHome(identity?.profileId ?? null);

  return (
    <HomeScreen
      home={home}
      displayName={identity?.displayName ?? identity?.handle ?? ""}
      profileId={identity?.profileId ?? null}
    />
  );
}
