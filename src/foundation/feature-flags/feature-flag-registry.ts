/**
 * Flag registry — Sprint 1.0 §5.
 *
 * The registry starts EMPTY. Build Rules §1/§2: a sprint registers only the
 * flags for the module it ships. No anticipatory flags for future features.
 */
import type { FeatureFlagDefinition, FeatureFlagSource } from "./feature-flags.types";

const definitions = new Map<string, FeatureFlagDefinition>();

export function registerFeatureFlag(definition: FeatureFlagDefinition): void {
  if (definitions.has(definition.key)) {
    throw new Error(`Feature flag already registered: ${definition.key}`);
  }
  definitions.set(definition.key, definition);
}

export function registerFeatureFlags(list: readonly FeatureFlagDefinition[]): void {
  list.forEach(registerFeatureFlag);
}

/** Test-support only: restores the registry to its empty initial state. */
export function resetFeatureFlagRegistry(): void {
  definitions.clear();
}

export const featureFlagRegistry: FeatureFlagSource = {
  list: () => Array.from(definitions.values()),
  get: (key) => definitions.get(key),
};
