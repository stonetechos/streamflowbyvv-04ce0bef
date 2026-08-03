/**
 * ProviderLauncher — Sprint 2.8, Foundation §2 and §12.
 *
 * The port through which StreamFlow asks the surrounding platform to open a
 * destination. It is deliberately the narrowest interface in the codebase:
 * one method, one argument, one boolean back.
 *
 * The narrowness is the safety property. A launcher cannot:
 *  - inspect playback, position, or provider state — nothing returns it;
 *  - control a player — there is no verb for it;
 *  - read or write a provider cookie, credential, or token — none is passed;
 *  - navigate StreamFlow itself — targets go to a separate context.
 *
 * `open` reports only whether the *request* was accepted by the platform.
 * Whether the app appeared, the title resolved, or anyone pressed play is
 * unknowable to StreamFlow, and no implementation may pretend otherwise.
 *
 * Domain owns this contract; Infrastructure supplies the browser, Capacitor,
 * or test implementation. Presentation must never call it directly — every
 * launch goes through `ProviderLaunchCoordinator` (Sprint 2.8 rule).
 */
import { createServiceToken } from "@/domain/service-registry";

import type { LaunchTarget } from "./provider-launch.types";

export interface ProviderLauncher {
  /** False when this runtime cannot open external destinations at all. */
  isAvailable(): boolean;
  /**
   * Hands the target to the platform. Never throws: an unavailable runtime, a
   * blocked pop-up, and an unregistered URI scheme are all `false`, so the UI
   * can offer a fallback instead of crashing.
   */
  open(target: LaunchTarget): boolean;
}

export const PROVIDER_LAUNCHER = createServiceToken<ProviderLauncher>("ProviderLauncher");

/**
 * The launcher used when no platform adapter is bound — during SSR, in tests,
 * and in any headless runtime. It refuses every launch rather than guessing,
 * which keeps "nothing happened" honest instead of silent.
 */
export function createNoopProviderLauncher(): ProviderLauncher {
  return {
    isAvailable: () => false,
    open: () => false,
  };
}
