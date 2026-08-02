import { createFileRoute } from "@tanstack/react-router";

import { WaitingRoom } from "@/features/waiting-room";

/**
 * Waiting Room route — Sprint 2.0.
 *
 * Guarded by the `_authenticated` layout: a lobby always has a viewer. The
 * route resolves the room id and hands off; all behaviour lives in the
 * feature module.
 */
export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  head: () => ({
    meta: [
      { title: "Waiting Room — StreamFlow" },
      {
        name: "description",
        content:
          "See who has arrived, signal that you're ready, and wait for the host before a StreamFlow watch session starts.",
      },
      { property: "og:title", content: "Waiting Room — StreamFlow" },
      {
        property: "og:description",
        content: "See who has arrived and signal that you're ready before the session starts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WaitingRoomRoute,
});

function WaitingRoomRoute() {
  const { roomId } = Route.useParams();
  return <WaitingRoom roomId={roomId} />;
}
