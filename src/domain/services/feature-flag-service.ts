/**
 * FeatureFlagService (Domain) — Foundation §3, §7, Sprint 1.6.
 *
 * Owns flag semantics and the catalog's flag events (§9). The Foundation-layer
 * evaluator remains the Presentation-side reader; this service is the business
 * authority that decides state changes and assignments.
 */
import type { CatalogEvent } from "@/domain/events/event-bus";
import type { AssignmentSource, FeatureFlagState } from "@/domain/shared/domain-enums";

import type { DomainServiceContext, Intent } from "./service-context";

export interface FlagEvaluationInput {
  readonly state: FeatureFlagState;
  /** 0–100. Only read when `state` is `percentage`. */
  readonly rolloutPercentage?: number;
  /** Deterministic bucket 0–99 derived from the profile id by the caller. */
  readonly bucket?: number;
  readonly isInternalTester?: boolean;
  readonly isTargeted?: boolean;
}

export interface FeatureFlagDomainService {
  isEnabled(input: FlagEvaluationInput): boolean;
  changeState(
    input: { flagId: string; key: string; fromState: FeatureFlagState; toState: FeatureFlagState },
    intent: Intent,
  ): Promise<CatalogEvent<"FeatureFlagChanged">>;
  assign(
    input: { flagId: string; profileId: string; assignmentSource: AssignmentSource },
    intent: Intent,
  ): Promise<CatalogEvent<"FeatureFlagAssigned">>;
}

export function createFeatureFlagDomainService(
  context: DomainServiceContext,
): FeatureFlagDomainService {
  const { events } = context;

  return {
    isEnabled(input) {
      switch (input.state) {
        case "on":
          return true;
        case "off":
          return false;
        case "internal":
          return input.isInternalTester === true;
        case "targeted":
          return input.isTargeted === true;
        case "percentage":
          return (input.bucket ?? 100) < (input.rolloutPercentage ?? 0);
      }
    },

    changeState: (input, intent) =>
      events.publish("FeatureFlagChanged", input.flagId, { ...input }, intent),

    assign: (input, intent) =>
      events.publish("FeatureFlagAssigned", input.flagId, { ...input }, intent),
  };
}
