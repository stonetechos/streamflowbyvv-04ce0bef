/**
 * Flag evaluator — Sprint 1.0 §5.
 *
 * Pure function of (definition, subject). Contains no product rules: it resolves
 * a state into a boolean and records how that verdict was reached.
 */
import type { FeatureFlagDefinition, FlagEvaluation, FlagSubject } from "./feature-flags.types";

/** Deterministic, stable 0–99 bucket from a subject id and a flag key (FNV-1a). */
export function bucketOf(bucketingId: string, flagKey: string): number {
  const input = `${flagKey}:${bucketingId}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 100;
}

export function evaluateFlag(
  definition: FeatureFlagDefinition | undefined,
  subject: FlagSubject | null,
): FlagEvaluation {
  // An unknown flag is off. Absence is never an implicit yes.
  if (!definition) {
    return { key: "unknown", enabled: false, source: "default" };
  }

  switch (definition.state) {
    case "on":
      return { key: definition.key, enabled: true, source: "manual" };
    case "off":
      return { key: definition.key, enabled: false, source: "manual" };
    case "internal":
      return {
        key: definition.key,
        enabled: Boolean(subject?.isInternalTester),
        source: "internal_tester",
      };
    case "targeted":
      return {
        key: definition.key,
        enabled: Boolean(subject && definition.targetedSubjects?.includes(subject.bucketingId)),
        source: "manual",
      };
    case "percentage": {
      const percentage = definition.rolloutPercentage ?? 0;
      const enabled = subject ? bucketOf(subject.bucketingId, definition.key) < percentage : false;
      return { key: definition.key, enabled, source: "percentage_bucket" };
    }
    default:
      return { key: definition.key, enabled: false, source: "default" };
  }
}
