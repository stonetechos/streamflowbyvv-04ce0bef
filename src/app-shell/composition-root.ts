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
import { registerEventInfrastructure } from "@/infrastructure/events";
import { registerIdentityAdapter } from "@/infrastructure/identity";
import { registerProviderAdapter } from "@/infrastructure/providers";
import { registerRoomAdapter } from "@/infrastructure/rooms";
import { registerTimeAdapter } from "@/infrastructure/time";
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
  // Sprint 2.5: the server-time reference behind clock synchronization.
  const timeBound = registerTimeAdapter();
  registerAuthServices();
  // Sprint 1.6: orchestration services and the internal event bus. Bound here so
  // nothing above Domain constructs a business service for itself.
  registerDomainServices();
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
  if (!timeBound) {
    logger.warn("No time adapter bound: clock synchronization is unavailable", { module: "sync" });
  }
  if (!eventsBound) {
    logger.warn("No event adapter bound: backend is not configured", { module: "events" });
  }
}
