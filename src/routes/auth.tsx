import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Authentication surface layout — Sprint 1.4 §11.
 * Public by design: the sign-in surface must never sit behind the guard.
 */

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — StreamFlow" },
      {
        name: "description",
        content:
          "Sign in to StreamFlow to create watch-together rooms and sync playback with your own streaming accounts.",
      },
      { property: "og:title", content: "Sign in — StreamFlow" },
      {
        property: "og:description",
        content: "Access your StreamFlow rooms, invites and voice sessions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <Outlet />,
});
