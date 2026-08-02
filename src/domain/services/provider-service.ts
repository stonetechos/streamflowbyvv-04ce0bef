/**
 * ProviderService — Foundation §3, §12, Sprint 1.6.
 *
 * Provider catalog semantics: status changes, capability support levels, and
 * the sync mode a provider implies (ADR-003). Contains no provider SDK, no
 * scraping, and no credential handling — by construction and by prohibition.
 */
import { domainError } from "@/domain/errors/domain-errors";
import type { CatalogEvent } from "@/domain/events/event-bus";
import type {
  CapabilitySupportLevel,
  ProviderCapability,
  ProviderStatus,
  SyncMode,
} from "@/domain/shared/domain-enums";

import type { DomainServiceContext, Intent } from "./service-context";

export interface ProviderService {
  changeStatus(
    input: { providerId: string; fromStatus: ProviderStatus; toStatus: ProviderStatus },
    intent: Intent,
  ): Promise<CatalogEvent<"ProviderStatusChanged">>;
  changeCapability(
    input: {
      providerId: string;
      capability: ProviderCapability;
      supportLevel: CapabilitySupportLevel;
    },
    intent: Intent,
  ): Promise<CatalogEvent<"ProviderCapabilityChanged">>;
  /** ADR-003: only `supported` remote control yields a controlled room. */
  resolveSyncMode(playPauseSupport: CapabilitySupportLevel): SyncMode;
  isSelectable(status: ProviderStatus): boolean;
  assertCapability(
    input: {
      providerId: string;
      capability: ProviderCapability;
      supportLevel: CapabilitySupportLevel;
    },
  ): void;
}

export function createProviderService(context: DomainServiceContext): ProviderService {
  const { events, clock } = context;

  return {
    resolveSyncMode: (playPauseSupport) =>
      playPauseSupport === "supported" ? "controlled" : "manual",

    isSelectable: (status) =>
      status === "available" || status === "degraded" || status === "manual_only",

    assertCapability({ providerId, capability, supportLevel }) {
      if (supportLevel === "unavailable" || supportLevel === "unverified") {
        throw domainError("PROVIDER_CAPABILITY_UNSUPPORTED", {
          operation: `ProviderService.assertCapability:${capability}`,
          aggregateId: providerId,
        });
      }
    },

    changeStatus: (input, intent) =>
      events.publish(
        "ProviderStatusChanged",
        input.providerId,
        { ...input, effectiveFrom: clock.now().toISOString() },
        intent,
      ),

    changeCapability: (input, intent) =>
      events.publish("ProviderCapabilityChanged", input.providerId, { ...input }, intent),
  };
}
