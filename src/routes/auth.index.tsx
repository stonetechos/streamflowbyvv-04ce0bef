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
    throw redirect({ to: "/auth/sign-in", replace: true });
  },
});
