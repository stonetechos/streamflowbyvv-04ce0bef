/**
 * Capability certification records — PROV-A1 (M0 Remediation Sprint).
 *
 * Constitution v2.0.0 states that sync capability is a property of a
 * *capability tuple* — `source · adapter · platform · version · region` — and
 * never of a provider's name. A tuple may only be claimed at Tier A or Tier B
 * when a certification record exists AND that record has status `certified`
 * with evidence attached.
 *
 * This module is the single registry of such records. It is deliberately
 * empty: as of the M0 audit StreamFlow has zero certified capabilities, so
 * every resolution falls through to Tier C. Adding an entry here without a
 * matching evidence file under `tests/certification/evidence/` is a
 * governance violation — `scripts/check-certification.mjs` enforces it.
 */

export const CAPABILITY_TIERS = ["a", "b", "c"] as const;
export type CapabilityTier = (typeof CAPABILITY_TIERS)[number];

export const CERTIFICATION_STATUSES = [
  "certified",
  "provisional",
  "expired",
  "revoked",
  "unknown",
] as const;
export type CertificationStatus = (typeof CERTIFICATION_STATUSES)[number];

/** The five dimensions that together identify a certifiable capability. */
export interface CapabilityTuple {
  /** Content source key, e.g. `youtube`, `local_file`. Never a brand claim. */
  readonly source: string;
  /** Adapter that provides the control surface, e.g. `youtube-iframe@1`. */
  readonly adapter: string;
  /** Runtime platform, e.g. `web-chromium`, `android-shell`. */
  readonly platform: string;
  /** Adapter/platform version range the record was measured against. */
  readonly version: string;
  /** Region code the record was measured in, or `*` when region-neutral. */
  readonly region: string;
}

/** A certification record. Every field is required — see WP5 evidence schema. */
export interface CapabilityCertification extends CapabilityTuple {
  readonly certificationId: string;
  readonly capability: string;
  readonly claimedTier: Exclude<CapabilityTier, "c">;
  readonly requiredResult: string;
  readonly measurementMethod: string;
  readonly passThreshold: string;
  readonly owner: string;
  readonly automationSupport: "automated" | "manual" | "unsupported";
  readonly manualValidation: string;
  readonly failureClassification: "blocking" | "non_blocking";
  readonly evidenceType: string;
  readonly evidenceLocation: string;
  readonly evidenceTimestamp: string;
  readonly runId: string;
  readonly commit: string;
  readonly environmentProfile: string;
  readonly reviewer: string;
  readonly certifiedDate: string;
  readonly revalidationDate: string;
  readonly lastKnownGoodBuild: string;
  readonly rollbackStatus: string;
  readonly blocking: boolean;
  readonly status: CertificationStatus;
}

/**
 * The certified capability registry.
 *
 * EMPTY BY DESIGN — M0 recorded 0/34 certification rows at PASS. Nothing may
 * be added here except as the output of a committed certification run.
 */
export const CAPABILITY_CERTIFICATIONS: readonly CapabilityCertification[] = [];

function matchesDimension(recorded: string, requested: string | undefined): boolean {
  if (recorded === "*") return true;
  if (!requested) return false;
  return recorded.toLowerCase() === requested.toLowerCase();
}

/** A record is only usable when it is certified and carries evidence. */
export function isCertificationValid(record: CapabilityCertification): boolean {
  return (
    record.status === "certified" &&
    record.evidenceLocation.trim().length > 0 &&
    record.evidenceTimestamp.trim().length > 0 &&
    record.runId.trim().length > 0
  );
}

/**
 * Find the valid certification for a fully-specified capability tuple.
 * Returns `null` when any dimension is missing or unmatched — the caller must
 * then treat the capability as Tier C.
 */
export type CapabilityTupleQuery = { [K in keyof CapabilityTuple]?: string | undefined };

export function findCapabilityCertification(
  request: CapabilityTupleQuery,
  registry: readonly CapabilityCertification[] = CAPABILITY_CERTIFICATIONS,
): CapabilityCertification | null {
  if (!request.source || !request.adapter || !request.platform || !request.version) return null;
  for (const record of registry) {
    if (!isCertificationValid(record)) continue;
    if (!matchesDimension(record.source, request.source)) continue;
    if (!matchesDimension(record.adapter, request.adapter)) continue;
    if (!matchesDimension(record.platform, request.platform)) continue;
    if (!matchesDimension(record.version, request.version)) continue;
    if (!matchesDimension(record.region, request.region ?? "*")) continue;
    return record;
  }
  return null;
}
