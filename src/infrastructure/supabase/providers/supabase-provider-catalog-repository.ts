/**
 * Supabase provider catalog adapter — Sprint 2.2.
 *
 * Read-only: the catalog is curated data (Database Spec §3.5) and the
 * application never writes it. Soft-deleted providers and expired compliance
 * rules are filtered here so no layer above has to remember to.
 */
import type {
  Provider,
  ProviderCapabilityEntry,
  ProviderComplianceRuleEntry,
} from "@/domain/providers/provider.types";
import type { ProviderCatalogRepository } from "@/repository/providers/provider-repository.types";

import type { DataConnection } from "../connection";
import { runQuery } from "../query-wrapper";
import { requireAvailable } from "../rooms/room-query-support";
import {
  PROVIDER_CAPABILITY_COLUMNS,
  PROVIDER_COLUMNS,
  PROVIDER_COMPLIANCE_RULE_COLUMNS,
  toProvider,
  toProviderCapability,
  toProviderComplianceRule,
  type ProviderCapabilityRow,
  type ProviderComplianceRuleRow,
  type ProviderRow,
} from "./provider-mapper";

const AGGREGATE = "providers";

export function createSupabaseProviderCatalogRepository(
  connection: DataConnection,
): ProviderCatalogRepository {
  const context = (operation: string) => ({ aggregate: AGGREGATE, operation });

  return {
    async listProviders(): Promise<readonly Provider[]> {
      requireAvailable(connection, context("listProviders"));
      const rows = await runQuery<ProviderRow[]>(
        connection
          .client()
          .from("providers")
          .select(PROVIDER_COLUMNS)
          .is("deleted_at", null)
          .order("sort_order", { ascending: true }),
        context("listProviders"),
      );
      return (rows ?? []).map(toProvider);
    },

    async listCapabilities(): Promise<readonly ProviderCapabilityEntry[]> {
      requireAvailable(connection, context("listCapabilities"));
      const rows = await runQuery<ProviderCapabilityRow[]>(
        connection
          .client()
          .from("provider_capabilities")
          .select(PROVIDER_CAPABILITY_COLUMNS),
        context("listCapabilities"),
      );
      return (rows ?? []).map(toProviderCapability);
    },

    async listComplianceRules(): Promise<readonly ProviderComplianceRuleEntry[]> {
      requireAvailable(connection, context("listComplianceRules"));
      const nowIso = new Date().toISOString();
      const rows = await runQuery<ProviderComplianceRuleRow[]>(
        connection
          .client()
          .from("provider_compliance_rules")
          .select(PROVIDER_COMPLIANCE_RULE_COLUMNS)
          .lte("effective_from", nowIso)
          .or(`effective_until.is.null,effective_until.gt.${nowIso}`),
        context("listComplianceRules"),
      );
      return (rows ?? []).map(toProviderComplianceRule);
    },
  };
}
