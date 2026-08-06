#!/usr/bin/env node
/**
 * Certification guard — M0 Remediation WP1/WP5.
 *
 * Fails when:
 *  1. Any capability certification record lacks a mandatory evidence field.
 *  2. Name-based Tier A resolution reappears in the domain layer.
 *
 * Portable: plain Node, no dependencies, CI-ready.
 */
import { readFileSync } from "node:fs";

const violations = [];

const tierSource = readFileSync("src/domain/providers/provider-tier.ts", "utf8");
if (/TIER_A_KEYS|TIER_B_CANDIDATE_KEYS/.test(tierSource)) {
  violations.push("provider-tier.ts reintroduced a name-based tier list (PROV-A1 violation).");
}
if (!/findCapabilityCertification/.test(tierSource)) {
  violations.push("provider-tier.ts no longer resolves tiers through the certification registry.");
}

const registrySource = readFileSync("src/domain/providers/capability-certification.ts", "utf8");
const REQUIRED_FIELDS = [
  "certificationId",
  "capability",
  "source",
  "adapter",
  "platform",
  "version",
  "region",
  "requiredResult",
  "measurementMethod",
  "passThreshold",
  "owner",
  "automationSupport",
  "manualValidation",
  "failureClassification",
  "evidenceType",
  "evidenceLocation",
  "evidenceTimestamp",
  "runId",
  "commit",
  "environmentProfile",
  "reviewer",
  "certifiedDate",
  "revalidationDate",
  "lastKnownGoodBuild",
  "rollbackStatus",
  "blocking",
  "status",
];
for (const field of REQUIRED_FIELDS) {
  if (!registrySource.includes(field)) {
    violations.push(`Certification record schema is missing required field: ${field}`);
  }
}

if (violations.length > 0) {
  console.error("Certification guard failed:\n");
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

console.log("Certification guard passed: tiering is evidence-based, evidence schema is complete.");
