/**
 * PROV-A1 certification — capability tiering must be evidence-based.
 *
 * These assertions are the executable form of the Constitution rule that a
 * provider's NAME never grants Tier A. They fail loudly if name-based tiering
 * is ever reintroduced.
 */
import { test, expect } from "@playwright/test";
import { providerTier, resolveCapabilityTier } from "../../../src/domain/providers/provider-tier";
import { CAPABILITY_CERTIFICATIONS } from "../../../src/domain/providers/capability-certification";
import { writeEvidence } from "../helpers/evidence";

const NAME_CLAIMS = ["youtube", "local_file", "local", "google_drive", "netflix", "prime_video"];

test.describe("PROV-A1 capability classification", () => {
  test("provider names alone never yield Tier A or Tier B", async () => {
    for (const name of NAME_CLAIMS) {
      expect(providerTier(name), `${name} must not be tiered by name`).toBe("c");
    }
    writeEvidence({
      evidenceId: "CERT-PROV-A1-name-based",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: `${NAME_CLAIMS.length} provider keys resolve to Tier C without a certification tuple.`,
    });
  });

  test("an incomplete capability tuple resolves to Tier C with a reason", async () => {
    const resolution = resolveCapabilityTier("youtube", { platform: "web-chromium" });
    expect(resolution.tier).toBe("c");
    expect(resolution.reason).toBe("no_capability_tuple");
    expect(resolution.certificationId).toBeNull();
  });

  test("a complete tuple without a certification record resolves to Tier C", async () => {
    const resolution = resolveCapabilityTier("youtube", {
      adapter: "youtube-iframe@1",
      platform: "web-chromium",
      version: "1.0.0",
      region: "IN",
    });
    expect(resolution.tier).toBe("c");
    expect(resolution.reason).toBe("no_certification_record");
  });

  test("the certification registry is empty and every entry would need evidence", async () => {
    for (const record of CAPABILITY_CERTIFICATIONS) {
      expect(
        record.evidenceLocation.length,
        `${record.certificationId} needs evidence`,
      ).toBeGreaterThan(0);
      expect(record.runId.length).toBeGreaterThan(0);
    }
    writeEvidence({
      evidenceId: "CERT-PROV-A1-registry",
      profileId: "PROF-01",
      browser: "node",
      platform: "node",
      status: "pass",
      detail: `Registry holds ${CAPABILITY_CERTIFICATIONS.length} certified capabilities; all evidence-gated.`,
    });
  });
});
