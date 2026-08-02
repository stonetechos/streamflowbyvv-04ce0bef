/**
 * Auth feature flag — Sprint 1.4, Foundation §7 / Build Rules §21.
 *
 * Every module ships behind a flag. `auth.core` is `off` because no identity
 * adapter exists yet: the architecture is present, the capability is not.
 */
import { registerFeatureFlag } from "@/foundation/feature-flags";

export const AUTH_CORE_FLAG = "auth.core";

let registered = false;

/** Idempotent — the registry rejects duplicate keys. */
export function registerAuthFeatureFlags(): void {
  if (registered) return;
  registered = true;
  registerFeatureFlag({
    key: AUTH_CORE_FLAG,
    description:
      "Authentication capability. Off until an identity adapter is bound in Infrastructure.",
    state: "off",
  });
}
