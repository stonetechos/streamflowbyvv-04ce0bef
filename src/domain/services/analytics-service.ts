/**
 * AnalyticsService — Foundation §3, Sprint 1.6.
 *
 * Normalizes analytics records and hands them to registered sinks. The service
 * knows no vendor: an Infrastructure adapter registers a sink at the
 * composition root in a later sprint. Consent is enforced here, once, so no
 * caller can route around `analytics_opt_in` (Database Spec §3.1).
 */
import type { DomainServiceContext } from "./service-context";

export interface AnalyticsRecord {
  readonly name: string;
  readonly occurredAt: string;
  readonly correlationId?: string | undefined;
  /** Identifiers and facts only — never free text, credentials, or content. */
  readonly properties: Readonly<Record<string, string | number | boolean>>;
}

export type AnalyticsSink = (record: AnalyticsRecord) => void;

export interface AnalyticsService {
  registerSink(sink: AnalyticsSink): () => void;
  /** No-ops when the profile has not opted in. */
  track(
    name: string,
    properties?: Record<string, string | number | boolean>,
    options?: { correlationId?: string },
  ): AnalyticsRecord | null;
  setConsent(optedIn: boolean): void;
  readonly hasConsent: boolean;
}

export function createAnalyticsService(context: DomainServiceContext): AnalyticsService {
  const { clock } = context;
  const sinks = new Set<AnalyticsSink>();
  let consent = false;

  return {
    get hasConsent() {
      return consent;
    },

    setConsent(optedIn) {
      consent = optedIn;
    },

    registerSink(sink) {
      sinks.add(sink);
      return () => {
        sinks.delete(sink);
      };
    },

    track(name, properties = {}, options = {}) {
      if (!consent) return null;
      const record: AnalyticsRecord = Object.freeze({
        name,
        occurredAt: clock.now().toISOString(),
        correlationId: options.correlationId,
        properties: Object.freeze({ ...properties }),
      });
      for (const sink of sinks) sink(record);
      return record;
    },
  };
}
