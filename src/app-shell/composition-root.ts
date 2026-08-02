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
import { registerIdentityAdapter } from "@/infrastructure/identity";
import { logger } from "@/foundation/logging";

let composed = false;

export function composeApplication(): void {
  if (composed) return;
  composed = true;

  // Infrastructure first: Domain services resolve their repositories lazily,
  // but binding before first render avoids a needless unavailable verdict.
  const identityBound = registerIdentityAdapter();
  registerAuthServices();

  if (!identityBound) {
    logger.warn("No identity adapter bound: backend is not configured", { module: "auth" });
  }
}
