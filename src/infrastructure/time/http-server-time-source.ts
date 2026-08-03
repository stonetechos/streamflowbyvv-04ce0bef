/**
 * HTTP server time source — Sprint 2.5 Infrastructure adapter.
 *
 * Satisfies the Domain's `ServerTimeSource` port against the app's own
 * `/api/public/time` endpoint. It is the only file in the sprint that knows a
 * URL exists.
 *
 * Deliberately dependency-free: `fetch` is a platform API in every target
 * (browser, Capacitor WebView, Node 18+, any standard React host), so this
 * adapter carries no vendor SDK and moves to another backend by changing one
 * path. Timing is taken as close to the request as possible on both sides.
 *
 * It sends no credentials — `credentials: "omit"` is explicit, because a clock
 * probe must never carry a session or a provider artifact.
 */
import type { ServerTimeProbe, ServerTimeSource } from "@/domain";
import { SYNC_RUNTIME } from "@/shared/constants/system-constants";

const TIME_ENDPOINT = "/api/public/time";

interface TimeResponseBody {
  readonly serverTimeMs?: unknown;
}

export function createHttpServerTimeSource(endpoint: string = TIME_ENDPOINT): ServerTimeSource {
  return {
    // `fetch` is the only requirement; an environment without it (an old test
    // harness, say) reports unavailable rather than throwing at call time.
    isAvailable: () => typeof fetch === "function",

    async probe(): Promise<ServerTimeProbe> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SYNC_RUNTIME.PROBE_TIMEOUT_MS);

      const clientSentMs = Date.now();
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          credentials: "omit",
          signal: controller.signal,
        });
        const clientReceivedMs = Date.now();

        if (!response.ok) {
          throw new Error(`Time probe failed with status ${response.status}`);
        }

        const body = (await response.json()) as TimeResponseBody;
        const serverTimeMs = Number(body.serverTimeMs);
        if (!Number.isFinite(serverTimeMs)) {
          throw new Error("Time probe returned no usable server time");
        }

        return { clientSentMs, serverTimeMs, clientReceivedMs };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
