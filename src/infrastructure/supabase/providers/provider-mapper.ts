/**
 * Provider row mappers — Sprint 2.2.
 *
 * The only module that knows the provider catalog lives in
 * `public.providers`, `public.provider_capabilities`,
 * `public.provider_compliance_rules`, and `public.provider_preferences`.
 * Rows enter, Domain models leave.
 */
import type {
  Provider,
  ProviderCapabilityEntry,
  ProviderComplianceRuleEntry,
  ProviderPreference,
} from "@/domain/providers/provider.types";
import {
  CAPABILITY_SUPPORT_LEVELS,
  COMPLIANCE_ACTIONS,
  COMPLIANCE_SCOPES,
  PROVIDER_CAPABILITIES,
  PROVIDER_CATEGORIES,
} from "@/domain/shared/domain-enums";
import { REPOSITORY_ERRORS, RepositoryError } from "@/repository";

import type { TableRow } from "../supabase.types";

/** Row shapes are the PROJECTIONS below, not the whole table. */
export type ProviderRow = Pick<
  TableRow<"providers">,
  | "id"
  | "code"
  | "key"
  | "display_name_key"
  | "category"
  | "homepage_url"
  | "logo_asset_key"
  | "is_enabled"
  | "sort_order"
  | "metadata"
  | "deleted_at"
>;
export type ProviderCapabilityRow = Pick<
  TableRow<"provider_capabilities">,
  "id" | "provider_id" | "capability" | "support_level" | "notes_key" | "verified_at"
>;
export type ProviderComplianceRuleRow = Pick<
  TableRow<"provider_compliance_rules">,
  | "id"
  | "provider_id"
  | "rule_key"
  | "action"
  | "scope"
  | "region_code"
  | "rationale_key"
  | "effective_from"
  | "effective_until"
>;
export type ProviderPreferenceRow = Pick<
  TableRow<"provider_preferences">,
  "id" | "profile_id" | "provider_id" | "is_favorite" | "is_hidden" | "last_used_at"
>;

/** Explicit projections — no `select("*")` across the boundary (Foundation §10). */
export const PROVIDER_COLUMNS =
  "id, code, key, display_name_key, category, homepage_url, logo_asset_key, is_enabled, sort_order, metadata, deleted_at";
export const PROVIDER_CAPABILITY_COLUMNS =
  "id, provider_id, capability, support_level, notes_key, verified_at";
export const PROVIDER_COMPLIANCE_RULE_COLUMNS =
  "id, provider_id, rule_key, action, scope, region_code, rationale_key, effective_from, effective_until";
export const PROVIDER_PREFERENCE_COLUMNS =
  "id, profile_id, provider_id, is_favorite, is_hidden, last_used_at";

function assertMember(
  allowed: readonly string[],
  value: string,
  aggregate: string,
  field: string,
): void {
  if (!allowed.includes(value)) {
    throw new RepositoryError(REPOSITORY_ERRORS.CONSTRAINT_VIOLATION, {
      aggregate,
      operation: `map:${field}`,
    });
  }
}

function toMetadata(value: unknown): Readonly<Record<string, unknown>> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.freeze({ ...(value as Record<string, unknown>) })
    : Object.freeze({});
}

export function toProvider(row: ProviderRow): Provider {
  assertMember(PROVIDER_CATEGORIES, row.category, "providers", "category");
  return {
    id: row.id,
    code: row.code,
    key: row.key,
    displayNameKey: row.display_name_key,
    category: row.category as Provider["category"],
    homepageUrl: row.homepage_url,
    logoAssetKey: row.logo_asset_key,
    isEnabled: row.is_enabled,
    sortOrder: row.sort_order,
    metadata: toMetadata(row.metadata),
  };
}

export function toProviderCapability(row: ProviderCapabilityRow): ProviderCapabilityEntry {
  assertMember(PROVIDER_CAPABILITIES, row.capability, "provider_capabilities", "capability");
  assertMember(
    CAPABILITY_SUPPORT_LEVELS,
    row.support_level,
    "provider_capabilities",
    "support_level",
  );
  return {
    providerId: row.provider_id,
    capability: row.capability as ProviderCapabilityEntry["capability"],
    supportLevel: row.support_level as ProviderCapabilityEntry["supportLevel"],
    notesKey: row.notes_key,
    verifiedAt: row.verified_at,
  };
}

export function toProviderComplianceRule(
  row: ProviderComplianceRuleRow,
): ProviderComplianceRuleEntry {
  assertMember(COMPLIANCE_ACTIONS, row.action, "provider_compliance_rules", "action");
  assertMember(COMPLIANCE_SCOPES, row.scope, "provider_compliance_rules", "scope");
  return {
    ruleId: row.id,
    providerId: row.provider_id,
    ruleKey: row.rule_key,
    action: row.action as ProviderComplianceRuleEntry["action"],
    scope: row.scope as ProviderComplianceRuleEntry["scope"],
    regionCode: row.region_code,
    rationaleKey: row.rationale_key,
  };
}

export function toProviderPreference(row: ProviderPreferenceRow): ProviderPreference {
  return {
    id: row.id,
    profileId: row.profile_id,
    providerId: row.provider_id,
    isFavorite: row.is_favorite,
    isHidden: row.is_hidden,
    lastUsedAt: row.last_used_at,
  };
}
