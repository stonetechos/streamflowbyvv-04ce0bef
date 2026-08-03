import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * `/auth` is an index, not a screen — Milestone E.
 *
 * The sign-in surface now lives at its own path so it can be linked, shared
 * and redirected to unambiguously. This route keeps the older `/auth` URL
 * working instead of breaking anyone's bookmark.
 */
export const Route = createFileRoute("/auth/")({
  beforeLoad: () => {
    // Sprint H1.6 §3 — emails sent before the callback route existed return
    // here carrying the provider's outcome in the query or the hash. Forward
    // it intact rather than dropping a valid confirmation on the sign-in page.
    if (typeof window !== "undefined") {
      const raw = `${window.location.search}${window.location.hash}`;
      if (/(access_token|refresh_token|[?&#]code=|error|type=)/.test(raw)) {
        window.location.replace(`/auth/callback${window.location.search}${window.location.hash}`);
        return;
      }
    }
    throw redirect({ to: "/auth/sign-in", replace: true });
  },
});
