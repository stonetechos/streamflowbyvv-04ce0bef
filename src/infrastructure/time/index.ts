/**
 * Time adapter selection — Sprint 2.5, mirroring the identity, room, and
 * provider seams.
 *
 * The composition root imports THIS module. Pointing clock synchronization at
 * a different reference (an NTP-backed service, a bespoke API, a socket) is a
 * change to this file plus one sibling adapter — nothing above Infrastructure
 * moves.
 */
import { SERVER_TIME_SOURCE } from "@/domain";
import { bindService, isServiceBound } from "@/domain/service-registry";

import { createHttpServerTimeSource } from "./http-server-time-source";

/** Describes the compiled-in time adapter. Diagnostics only — never branch on it. */
export interface TimeAdapterDescriptor {
  readonly id: string;
  /** Round-trip probes are timed client-side, per Foundation §15. */
  readonly supportsRoundTripProbe: true;
}

export const ACTIVE_TIME_ADAPTER: TimeAdapterDescriptor = Object.freeze({
  id: "http-app-endpoint",
  supportsRoundTripProbe: true,
});

/** Binds the `ServerTimeSource` port to the active adapter. Idempotent. */
export function registerTimeAdapter(): boolean {
  if (isServiceBound(SERVER_TIME_SOURCE)) return true;
  const source = createHttpServerTimeSource();
  bindService(SERVER_TIME_SOURCE, () => source);
  return source.isAvailable();
}

export { createHttpServerTimeSource } from "./http-server-time-source";
