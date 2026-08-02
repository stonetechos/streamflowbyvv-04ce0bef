/**
 * ComplianceService — Foundation §3, §11, Sprint 1.6.
 *
 * Every provider-touching path calls this service; there is no second path and
 * no fast path (Build Rules §19). It issues a verdict, records it in the event
 * stream (catalog §7), and refuses blocked actions outright. It never bypasses
 * DRM, never proxies media, and never stores provider credentials.
 */
import { domainError } from "@/domain/errors/domain-errors";
import type { CatalogEvent } from "@/domain/events/event-bus";
import type { ComplianceAction, ComplianceScope } from "@/domain/shared/domain-enums";

import type { DomainServiceContext, Intent } from "./service-context";

export interface ComplianceRule {
  readonly ruleId: string;
  readonly providerId: string;
  readonly scope: ComplianceScope;
  /** Required when `scope` is `region`. */
  readonly regionCode: string | null;
  readonly action: ComplianceAction;
}

export interface ComplianceRequest {
  readonly providerId: string;
  readonly regionCode: string;
  readonly attemptedAction: string;
  readonly origin: string;
  readonly rules: readonly ComplianceRule[];
}

export interface ComplianceVerdict {
  readonly action: ComplianceAction;
  readonly ruleId: string;
  readonly allowed: boolean;
  readonly requiresManualSync: boolean;
}

export interface ComplianceService {
  /** Most restrictive matching rule wins; absence of a rule is not permission. */
  evaluate(request: ComplianceRequest): ComplianceVerdict;
  issueVerdict(
    request: ComplianceRequest,
    intent: Intent,
  ): Promise<{ verdict: ComplianceVerdict; event: CatalogEvent }>;
  assertAllowed(verdict: ComplianceVerdict, providerId: string): void;
}

const SEVERITY: Readonly<Record<ComplianceAction, number>> = Object.freeze({
  allow: 0,
  warn: 1,
  manual_only: 2,
  block: 3,
});

/** No rule for a provider means unverified, which is never an allow. */
const DEFAULT_RULE_ID = "compliance.default.unverified";

export function createComplianceService(context: DomainServiceContext): ComplianceService {
  const { events } = context;

  const evaluate = (request: ComplianceRequest): ComplianceVerdict => {
    const matching = request.rules.filter(
      (rule) =>
        rule.providerId === request.providerId &&
        (rule.scope === "global" || rule.regionCode === request.regionCode),
    );

    if (matching.length === 0) {
      return {
        action: "block",
        ruleId: DEFAULT_RULE_ID,
        allowed: false,
        requiresManualSync: false,
      };
    }

    const strictest = matching.reduce((worst, rule) =>
      SEVERITY[rule.action] > SEVERITY[worst.action] ? rule : worst,
    );

    return {
      action: strictest.action,
      ruleId: strictest.ruleId,
      allowed: strictest.action !== "block",
      requiresManualSync: strictest.action === "manual_only",
    };
  };

  return {
    evaluate,

    assertAllowed(verdict, providerId) {
      if (!verdict.allowed) {
        throw domainError("COMPLIANCE_ACTION_BLOCKED", {
          operation: "ComplianceService.assertAllowed",
          aggregateId: providerId,
        });
      }
    },

    async issueVerdict(request, intent) {
      const verdict = evaluate(request);
      const event = verdict.allowed
        ? await events.publish(
            "ComplianceVerdictIssued",
            request.providerId,
            {
              providerId: request.providerId,
              regionCode: request.regionCode,
              action: verdict.action,
              ruleId: verdict.ruleId,
              correlationId: intent.correlationId,
            },
            intent,
          )
        : await events.publish(
            "ComplianceActionBlocked",
            request.providerId,
            {
              providerId: request.providerId,
              regionCode: request.regionCode,
              attemptedAction: request.attemptedAction,
              ruleId: verdict.ruleId,
              origin: request.origin,
            },
            intent,
          );
      return { verdict, event: event as CatalogEvent };
    },
  };
}
