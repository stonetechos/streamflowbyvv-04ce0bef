/**
 * Server time endpoint — Sprint 2.5.
 *
 * The clock-synchronization reference for every client. It answers with the
 * server's own epoch milliseconds and nothing else: no session, no user data,
 * no provider artifact. It is public because a clock reading is not a secret
 * and because an unauthenticated client must be able to measure before it can
 * schedule anything (Foundation §15).
 *
 * Caching is disabled explicitly — a cached timestamp is worse than none.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/time")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify({ serverTimeMs: Date.now() }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }),
    },
  },
});
