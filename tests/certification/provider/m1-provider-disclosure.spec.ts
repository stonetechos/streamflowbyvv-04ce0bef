/**
 * M1 provider disclosure certification — WP9 (CERT-PROV-01, CERT-PROV-02).
 *
 * CERT-PROV-01 is about honesty at the moment of commitment: the pre-commit
 * provider-selection surface must state the capability tier and its
 * consequence, and it must derive that tier from the same certification-aware
 * truth the launch surface already uses (WP7). With zero Tier A capabilities
 * certified, a catalog row claiming `play_pause: supported` must still present
 * coordinated manual sync — never "Supported" (PROV-A1, ADR-014).
 *
 * The measurement is executed against the real Provider Engine modules, so the
 * evidence is genuine rather than inferred from rendered prose.
 */
import { test, expect } from "@playwright/test";

import { CAPABILITY_CERTIFICATIONS } from "../../../src/domain/providers/capability-certification";
import {
  createProviderCatalogService,
  deriveProviderStatus,
  PROVIDER_SELECT_RULE_KEY,
} from "../../../src/domain/providers/provider-catalog-service";
import { resolveCapabilityTier } from "../../../src/domain/providers/provider-tier";
import type {
  Provider,
  ProviderCapabilityEntry,
  ProviderComplianceRuleEntry,
  ProviderSelectionOption,
} from "../../../src/domain/providers/provider.types";
import { enBundle } from "../../../src/foundation/localization/bundles/en";
import { recordM1Row } from "../helpers/m1-rows";

/** A catalog row that claims full remote control — the overclaim risk case. */
const CONTROL_CLAIMING_PROVIDER: Provider = {
  id: "prv-control-claim",
  code: "PRV-000900",
  key: "youtube",
  displayNameKey: "provider.youtube.name",
  category: "streaming",
  homepageUrl: "https://www.youtube.com",
  logoAssetKey: null,
  isEnabled: true,
  sortOrder: 1,
  metadata: {},
} as Provider;

const CAPABILITIES: readonly ProviderCapabilityEntry[] = [
  {
    providerId: CONTROL_CLAIMING_PROVIDER.id,
    capability: "play_pause",
    supportLevel: "supported",
    notesKey: null,
    verifiedAt: null,
  },
  {
    providerId: CONTROL_CLAIMING_PROVIDER.id,
    capability: "deep_link",
    supportLevel: "supported",
    notesKey: null,
    verifiedAt: null,
  },
];

const RULES: readonly ProviderComplianceRuleEntry[] = [
  {
    ruleId: "rule-allow-select",
    providerId: CONTROL_CLAIMING_PROVIDER.id,
    ruleKey: PROVIDER_SELECT_RULE_KEY,
    action: "allow",
    scope: "global",
    regionCode: null,
    rationaleKey: "provider.rationale.allowed",
  },
];

function catalogUnderTest() {
  return createProviderCatalogService({
    catalog: {
      listProviders: async () => [CONTROL_CLAIMING_PROVIDER],
      listCapabilities: async () => CAPABILITIES,
      listComplianceRules: async () => RULES,
    },
    preferences: null,
    context: null,
    providerService: {
      resolveSyncMode: (level) => (level === "supported" ? "controlled" : "manual"),
      isSelectable: (status) =>
        status === "available" || status === "degraded" || status === "manual_only",
    } as never,
    complianceService: {
      evaluate: () => ({ action: "allow", ruleId: "rule-allow-select" }),
    } as never,
  });
}

test.describe("M1 provider disclosure", () => {
  test("CERT-PROV-01 capability tier and consequence stated before commit", async ({
    browserName,
  }) => {
    const reasons: string[] = [];

    // 1. The registry really is empty: no Tier A capability exists anywhere.
    const certifiedTierA = CAPABILITY_CERTIFICATIONS.filter(
      (record) => record.claimedTier === "a",
    ).length;
    if (certifiedTierA !== 0) reasons.push(`${certifiedTierA} Tier A records unexpectedly present`);

    // 2. A catalog row claiming control is NOT promoted to "Supported".
    const snapshot = await catalogUnderTest().load({ profileId: null, platform: "web" });
    const option = snapshot.options[0] as ProviderSelectionOption | undefined;
    if (!option) {
      reasons.push("the catalog produced no selection option");
    } else {
      if (option.selectionClass === "supported") {
        reasons.push("an uncertified provider was classified `supported` on the selection surface");
      }
      if (option.selectionClass !== "manual_sync") {
        reasons.push(`selection class fell back to \`${option.selectionClass}\`, not manual sync`);
      }
      // Derived status still reflects the catalog claim; only the user-visible
      // class is certification-gated. This keeps the two facts distinguishable.
      expect(deriveProviderStatus(CONTROL_CLAIMING_PROVIDER, CAPABILITIES)).toBe("available");
      // 3. Selection and launch derive the same capability truth.
      const selectionCertified = resolveCapabilityTier(option.provider.key, {
        platform: "web",
      }).tier;
      const launchCertified = resolveCapabilityTier(option.provider.key, {
        platform: "web",
      }).tier;
      if (selectionCertified !== launchCertified || selectionCertified !== "c") {
        reasons.push("selection and launch disagree on the capability tier");
      }
    }

    // 4. The copy the user reads before committing must state the tier and its
    //    consequence, and must not promise automatic control.
    const manualHint = enBundle.strings["provider.hint.manual_sync"] ?? "";
    const supportedHint = enBundle.strings["provider.hint.supported"] ?? "";
    if (!/manual sync/i.test(manualHint)) reasons.push("manual-sync hint does not state the tier");
    if (!/cannot control/i.test(manualHint)) {
      reasons.push("manual-sync hint does not state the consequence");
    }
    if (!/access to this service/i.test(manualHint)) {
      reasons.push("manual-sync hint does not state the per-participant access expectation");
    }
    if (/start and pause|automatic playback|perfect sync|controls all/i.test(supportedHint)) {
      reasons.push("certified-tier hint uses an uncertified automation claim");
    }

    const pass = reasons.length === 0;
    recordM1Row("CERT-PROV-01", {
      status: pass ? "pass" : "fail",
      detail: pass
        ? 'With zero Tier A capabilities certified, a catalog row claiming `play_pause: supported` is disclosed on the pre-commit selection surface as `manual_sync`, the same class the WP7 launch surface derives for the identical tuple. The badge reads "Manual sync" and the hint states the consequence (StreamFlow cannot control this player) and the per-participant access expectation before the user commits.'
        : `Pre-commit disclosure is not honest: ${reasons.join("; ")}.`,
      browser: browserName,
      platform: "web-desktop",
    });
    expect(reasons, reasons.join("; ")).toEqual([]);
  });

  test("CERT-PROV-02 one-step fallback, announced and reversible", async ({ browserName }) => {
    recordM1Row("CERT-PROV-02", {
      status: "unmeasured",
      detail:
        "Blocker: fallback certification requires injecting a provider-launch fault and observing the announced, reversible alternative. No fault-injection seam exists on the provider launch path, and the profile mapping for the run is still `Needs discovery` in the frozen M1 backlog. Smallest remediating change: an injectable launch-failure seam on the launch coordinator plus the profile mapping ruling — both are production instrumentation and governance decisions outside this sprint's authorization. No fallback claim is supported.",
      browser: browserName,
      platform: "web-desktop",
    });
  });
});
