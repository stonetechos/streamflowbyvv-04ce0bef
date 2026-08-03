import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { claimDestination, useAuth } from "@/features/auth";

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
  component: AuthLayout,
});

/** Auth outcomes the provider appends to an emailed link. */
const LINK_PARAMS = /(access_token=|refresh_token=|error=|error_code=|type=recovery)/;

/** Screens that must still run with a session: recovery, sign-out, callbacks. */
const SESSION_AWARE_PATHS = /^\/auth\/(callback|reset-password|sign-out)/;

function AuthLayout() {
  const navigate = useNavigate();
  const auth = useAuth();

  // Release Blocker 3 — someone who is already signed in is never asked to
  // sign in or create an account again; they continue where they were headed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!auth.isSettled || !auth.isAuthenticated) return;
    if (SESSION_AWARE_PATHS.test(window.location.pathname)) return;
    const destination = claimDestination() ?? "/home";
    void navigate({ to: destination, replace: true });
  }, [auth.isAuthenticated, auth.isSettled, navigate]);

  // Sprint H1.6 §3 — links mailed before the callback route existed point at
  // `/auth`, and the fragment survives the redirect to sign-in. Hand it to the
  // one screen that knows how to finish the journey instead of dropping it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { pathname, hash, search } = window.location;
    if (pathname.startsWith("/auth/callback")) return;
    if (!LINK_PARAMS.test(`${search}${hash}`)) return;
    void navigate({ to: "/auth/callback", replace: true, search: true, hash: hash.slice(1) });
  }, [navigate]);

  return <Outlet />;
}
