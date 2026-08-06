/**
 * Composition root — Sprint 1.5 §9.
 *
 * The one place implementations are bound to contracts. It names the neutral
 * seams (`@/infrastructure/identity`) and never an adapter, so the layers
 * above stay vendor-free and the architecture guard stays green.
 *
 * Idempotent: safe to import from any entry point.
 */
import { registerAuthServices } from "@/domain/auth";
import { registerDomainServices } from "@/domain/services";
import { registerWatchServices } from "@/domain/watch";
import { registerEventInfrastructure } from "@/infrastructure/events";
import { registerIdentityAdapter } from "@/infrastructure/identity";
import { registerProfileAdapter } from "@/infrastructure/profiles";
import { registerProviderAdapter } from "@/infrastructure/providers";
import { registerSocialAdapter } from "@/infrastructure/social";

import { registerRoomAdapter } from "@/infrastructure/rooms";
import { registerTimeAdapter } from "@/infrastructure/time";
import { registerVoiceInfrastructure } from "@/infrastructure/voice";
import { logger } from "@/foundation/logging";

let composed = false;

export function composeApplication(): void {
  if (composed) return;
  composed = true;

  // Infrastructure first: Domain services resolve their repositories lazily,
  // but binding before first render avoids a needless unavailable verdict.
  const identityBound = registerIdentityAdapter();
  // Sprint 1.7: room, room-state, room-member, and invite persistence.
  const roomsBound = registerRoomAdapter();
  // Sprint 2.2: provider catalog, capability matrix, compliance rules, prefs.
  const providersBound = registerProviderAdapter();
  // Milestone E: profile and the five preference aggregates.
  const profilesBound = registerProfileAdapter();
  // Milestone F.0: friend graph, block list, directory, recent partners.
  const socialBound = registerSocialAdapter();
  // Sprint 2.5: the server-time reference behind clock synchronization.

  const timeBound = registerTimeAdapter();
  // Milestone G: the voice transport and the grant seam. Browser only.
  const voiceBound = registerVoiceInfrastructure();
  registerAuthServices();
  // Sprint 1.6: orchestration services and the internal event bus. Bound here so
  // nothing above Domain constructs a business service for itself.
  registerDomainServices();
  // Sprint H1: room chat and host-authoritative watch sync.
  registerWatchServices();
  // Sprint 1.9: event persistence, projections, analytics sink, and the
  // outbound realtime publisher. After the bus exists, before first publish.
  const eventsBound = registerEventInfrastructure();

  if (!identityBound) {
    logger.warn("No identity adapter bound: backend is not configured", { module: "auth" });
  }
  if (!roomsBound) {
    logger.warn("No room adapter bound: backend is not configured", { module: "rooms" });
  }
  if (!providersBound) {
    logger.warn("No provider adapter bound: backend is not configured", { module: "providers" });
  }
  if (!profilesBound) {
    logger.warn("No profile adapter bound: backend is not configured", { module: "profiles" });
  }
  if (!socialBound) {
    logger.warn("No social adapter bound: backend is not configured", { module: "social" });
  }
  if (!timeBound) {
    logger.warn("No time adapter bound: clock synchronization is unavailable", { module: "sync" });
  }
  if (!voiceBound && typeof window !== "undefined") {
    logger.warn("No voice transport bound: voice is unavailable", { module: "voice" });
  }
  if (!eventsBound) {
    logger.warn("No event adapter bound: backend is not configured", { module: "events" });
  }
}
