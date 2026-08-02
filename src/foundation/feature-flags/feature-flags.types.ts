/**
 * Feature flag framework — Sprint 1.0 §5.
 *
 * Traceability: Foundation §7. States are `off`, `on`, `internal`, `percentage`,
 * `targeted`. Flags gate BEHAVIOUR only: they never branch the schema and they
 * never carry business logic. A flag definition is inert data.
 */

export const FLAG_STATES = ["off", "on", "internal", "percentage", "targeted"] as const;
export type FlagState = (typeof FLAG_STATES)[number];

export interface FeatureFlagDefinition {
  /** Stable key, lowercase dot-separated, e.g. `room.creation`. */
  readonly key: string;
  readonly description: string;
  readonly state: FlagState;
  /** 0–100. Read only when `state` is `percentage`. */
  readonly rolloutPercentage?: number;
  /** Opaque subject identifiers. Read only when `state` is `targeted`. */
  readonly targetedSubjects?: readonly string[];
}

/**
 * Evaluation subject. Deliberately opaque: the framework never learns what a
 * user is, only a stable bucketing identifier and whether it is an internal
 * tester. Populating it is the identity module's job in a later sprint.
 */
export interface FlagSubject {
  /** Stable per-subject identifier used for percentage bucketing. */
  readonly bucketingId: string;
  readonly isInternalTester: boolean;
}

/** Mirrors `assignment_source` in the Database Specification §5. */
export type FlagAssignmentSource = "manual" | "percentage_bucket" | "internal_tester";

export interface FlagEvaluation {
  readonly key: string;
  readonly enabled: boolean;
  readonly source: FlagAssignmentSource | "default";
}

export interface FeatureFlagSource {
  /** Returns every definition known to this source. */
  list(): readonly FeatureFlagDefinition[];
  get(key: string): FeatureFlagDefinition | undefined;
}
