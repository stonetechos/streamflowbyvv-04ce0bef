import { createFileRoute } from "@tanstack/react-router";

import { useAuth } from "@/features/auth";
import { ShareIntakeScreen } from "@/features/share";

/**
 * Share target — Milestone L.
 *
 * Where the primary journey now begins. A share sheet (or a pasted link)
 * arrives as plain query parameters, exactly as the Web Share Target
 * specification delivers them; the feature places the content and hands the
 * room over to the existing waiting-room flow.
 */
export const Route = createFileRoute("/_authenticated/share")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { url?: string; text?: string; title?: string } => ({
    ...(typeof search["url"] === "string" ? { url: search["url"] } : {}),
    ...(typeof search["text"] === "string" ? { text: search["text"] } : {}),
    ...(typeof search["title"] === "string" ? { title: search["title"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Shared to StreamFlow — start a watch party" },
      {
        name: "description",
        content:
          "StreamFlow turns a movie or episode you shared from your streaming app into a synchronized watch party room.",
      },
      { property: "og:title", content: "Shared to StreamFlow" },
      {
        property: "og:description",
        content: "Turn a shared movie or episode into a synchronized watch party.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShareRoute,
});

function ShareRoute() {
  const search = Route.useSearch();
  const auth = useAuth();

  return (
    <ShareIntakeScreen
      payload={{
        url: search.url ?? null,
        text: search.text ?? null,
        title: search.title ?? null,
      }}
      profileId={auth.session?.identity?.profileId ?? null}
    />
  );
}
