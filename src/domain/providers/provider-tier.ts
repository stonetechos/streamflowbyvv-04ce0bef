/**
 * Capability tier resolution — Watch Party Engine v2.0, ADR-014, PROV-A1.
 *
 * PROV-A1 (M0 Remediation Sprint) removed name-based tiering. A provider's
 * name grants nothing. A capability reaches Tier A or Tier B only when a
 * valid certification record exists for its full tuple
 * (`source · adapter · platform · version · region`) in
 * `capability-certification.ts`. The registry is currently empty, so every
 * capability resolves to Tier C — the honest default: deep link, countdown,
 * voice, and everyone presses play on their own.
 *
 *  - Tier A — certified control surface (sanctioned embeddable player or a
 *    file the member owns). Requires evidence.
 *  - Tier B — certified *observation only* (system media session). Observation
 *    is never control. Requires evidence.
 *  - Tier C — coordinated manual sync. No certification required.
 *
 * Nothing here grants a capability; it only reports one that certification
 * already proved. No caller may upgrade a tier by passing a flag.
 */

import {
  CAPABILITY_CERTIFICATIONS,
  findCapabilityCertification,
  type CapabilityCertification,
  type CapabilityTuple,
} from "./capability-certification";

export const PROVIDER_TIERS = ["a", "b", "c"] as const;
export type ProviderTier = (typeof PROVIDER_TIERS)[number];

export interface ProviderTierContext {
  /** Adapter identifier that will actually drive the surface, if any. */
  readonly adapter?: string;
  /** Runtime platform identifier, e.g. `web-chromium`, `android-shell`. */
  readonly platform?: string;
  /** Adapter/platform version presented at runtime. */
  readonly version?: string;
  /** Region the member is resolving in. */
  readonly region?: string;
  /** Registry override; tests inject fixtures, production uses the default. */
  readonly registry?: readonly CapabilityCertification[];
}

export interface CapabilityTierResolution {
  readonly tier: ProviderTier;
  /** Why the tier is what it is — surfaced in telemetry, never in marketing. */
  readonly reason:
    | "certified"
    | "no_capability_tuple"
    | "no_certification_record"
    | "no_source";
  readonly certificationId: string | null;
}

/**
 * Full resolution with a reason code. Prefer this in telemetry, analytics, and
 * room disclosure paths so an uncertified capability is auditable.
 */
export function resolveCapabilityTier(
  source: string | null | undefined,
  context: ProviderTierContext = {},
): CapabilityTierResolution {
  const key = source?.trim().toLowerCase();
  if (!key) return { tier: "c", reason: "no_source", certificationId: null };

  const tuple: Partial<CapabilityTuple> = {
    source: key,
    adapter: context.adapter,
    platform: context.platform,
    version: context.version,
    region: context.region ?? "*",
  };

  if (!tuple.adapter || !tuple.platform || !tuple.version) {
    return { tier: "c", reason: "no_capability_tuple", certificationId: null };
  }

  const record = findCapabilityCertification(tuple, context.registry ?? CAPABILITY_CERTIFICATIONS);
  if (!record) return { tier: "c", reason: "no_certification_record", certificationId: null };

  return { tier: record.claimedTier, reason: "certified", certificationId: record.certificationId };
}

/** Backwards-compatible accessor. Returns the certified tier, or `c`. */
export function providerTier(
  source: string | null | undefined,
  context: ProviderTierContext = {},
): ProviderTier {
  return resolveCapabilityTier(source, context).tier;
}

export function providerTierLabelKey(tier: ProviderTier): string {
  return `provider.tier.${tier}.label`;
}

/** One plain sentence describing what the room can expect. */
export function providerTierSummaryKey(tier: ProviderTier): string {
  return `provider.tier.${tier}.summary`;
}

/** True when the room's togetherness rests on people, not on machinery. */
export function tierRequiresManualPlay(tier: ProviderTier): boolean {
  return tier !== "a";
}
