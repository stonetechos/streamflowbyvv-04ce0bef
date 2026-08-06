import { createFileRoute } from "@tanstack/react-router";

import { Theater } from "@/features/theater";

/**
 * Theater route — Sprint H1.
 *
 * The watch surface itself: shared stage, host transport, sync verdict, and
 * chat. Guarded by `_authenticated`; membership is enforced by the room model.
 */
export const Route = createFileRoute("/_authenticated/theater/$roomId")({
  head: () => ({
    meta: [
      { title: "Theater — StreamFlow" },
      {
        name: "description",
        content:
          "Watch together in sync: a shared stage, host-led playback, live chat, and an honest sync readout.",
      },
      { property: "og:title", content: "Theater — StreamFlow" },
      {
        property: "og:description",
        content: "Watch together in sync with host-led playback and live chat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TheaterRoute,
});

function TheaterRoute() {
  const { roomId } = Route.useParams();
  return <Theater roomId={roomId} />;
}
