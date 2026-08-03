/**
 * Server time source port — Sprint 2.5, Foundation §5 and §15.
 *
 * The Domain needs one thing from the outside world to synchronize clocks: an
 * answer to "what time does the server think it is?", timed from both ends.
 * This is that seam, and it is deliberately tiny.
 *
 * It names no transport, no vendor, and no endpoint. An adapter may satisfy it
 * with HTTP, a socket, or a fixture in a test; swapping any of those is an
 * Infrastructure change and nothing above Infrastructure moves.
 *
 * It carries no credential of any kind — no provider token, no cookie, no
 * session artifact. A time probe is the least sensitive request the app makes.
 */
import { createServiceToken } from "@/domain/service-registry";

import type { ServerTimeProbe } from "./sync.types";

export interface ServerTimeSource {
  /** False when no time endpoint is reachable; callers degrade, never crash. */
  isAvailable(): boolean;
  /**
   * One round-trip measurement. Implementations must time the request from the
   * client side and must reject rather than guess when the server does not
   * answer within the probe timeout.
   */
  probe(): Promise<ServerTimeProbe>;
}

export const SERVER_TIME_SOURCE = createServiceToken<ServerTimeSource>("ServerTimeSource");
