/**
 * Browser provider launcher — Sprint 2.8.
 *
 * The platform half of the `ProviderLauncher` port: it asks the browser to
 * open a public address in a separate context and reports whether the request
 * was accepted. That is the entire adapter.
 *
 * It cannot do more, and this is by construction:
 *  - `noopener,noreferrer` severs the link between StreamFlow and the opened
 *    context, so neither page can script the other and no referrer leaks;
 *  - nothing is read back — no window handle is retained, no `postMessage`
 *    channel exists, no cookie, storage, or provider session is touched;
 *  - StreamFlow's own document is never navigated.
 *
 * App URI schemes (`nflx:`, `youtube:`) are handed to the operating system the
 * same way. If no app is registered the OS quietly does nothing, which is why
 * `ProviderLaunchCoordinator` always offers a web fallback: an unhandled
 * scheme is indistinguishable from a successful hand-off from in here, and the
 * adapter must not pretend to know the difference.
 *
 * Under Capacitor the same port is satisfied by the native `App`/`Browser`
 * plugin without anything above Infrastructure changing.
 */
import type { LaunchTarget, ProviderLauncher } from "@/domain";

/** Addresses this adapter is willing to hand to the platform. */
const ALLOWED_PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/** Never open these, whatever a catalog row claims. */
const FORBIDDEN_PROTOCOLS = new Set(["javascript:", "data:", "file:", "blob:", "vbscript:"]);

function isOpenable(url: string): boolean {
  const trimmed = url.trim();
  if (!ALLOWED_PROTOCOL_PATTERN.test(trimmed)) return false;
  const protocol = trimmed.slice(0, trimmed.indexOf(":") + 1).toLowerCase();
  return !FORBIDDEN_PROTOCOLS.has(protocol);
}

export function createBrowserProviderLauncher(): ProviderLauncher {
  const isAvailable = (): boolean =>
    typeof window !== "undefined" && typeof window.open === "function";

  return {
    isAvailable,

    open(target: LaunchTarget): boolean {
      if (!isAvailable() || !isOpenable(target.url)) return false;
      try {
        // The handle is deliberately discarded: holding it would be the
        // beginning of exactly the provider inspection this sprint forbids.
        window.open(target.url, "_blank", "noopener,noreferrer");
        return true;
      } catch {
        // A blocked pop-up is a normal outcome, not an error condition.
        return false;
      }
    },
  };
}
