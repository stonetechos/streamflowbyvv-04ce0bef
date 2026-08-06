#!/usr/bin/env node
/**
 * Evidence repository manager — M0.5 WP3.
 *
 * Guarantees:
 *  - Every run directory has the full immutable layout.
 *  - A completed run is never silently overwritten (CERT_FORCE_RUN=1 to override).
 *  - Historical runs are never pruned.
 *
 * Usage: node scripts/evidence.mjs [--run <RUN-ID>]
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  EVIDENCE_ROOT,
  ensureRunLayout,
  latestRun,
  listRunIds,
  loadRun,
  recordsById,
  tally,
  writeFileEnsured,
} from "./lib/evidence-io.mjs";

const argRun = process.argv.includes("--run")
  ? process.argv[process.argv.indexOf("--run") + 1]
  : undefined;
const runId = argRun ?? process.env["CERT_RUN_ID"] ?? latestRun()?.runId;

if (!runId) {
  console.error("No evidence run found. Run `npm run cert` first.");
  process.exit(1);
}

const summaryPath = join(EVIDENCE_ROOT, runId, "summary.json");
if (existsSync(summaryPath) && process.env["CERT_FORCE_RUN"] !== "1") {
  const existing = JSON.parse((await import("node:fs")).readFileSync(summaryPath, "utf8"));
  if (existing.sealed) {
    console.log(`Run ${runId} is sealed; evidence preserved unchanged.`);
    process.exit(0);
  }
}

ensureRunLayout(runId);
const run = loadRun(runId);
const records = [...recordsById(run).values()];
const counts = tally(records);

const missing = records.filter(
  (r) => !r.evidenceId || !r.status || !r.runId || !r.commit || !r.environmentProfile,
);
if (missing.length > 0) {
  console.error(`Evidence validation failed: ${missing.length} record(s) missing mandatory fields.`);
  for (const record of missing) console.error(`  - ${record.evidenceId ?? "<no id>"}`);
  process.exit(1);
}

const summary = {
  runId,
  sealed: true,
  commit: records[0]?.commit ?? "unknown",
  environmentProfile: records[0]?.environmentProfile ?? "unknown",
  region: records[0]?.region ?? "unknown",
  collectedAt: new Date().toISOString(),
  counts,
  rows: records
    .map((r) => ({ evidenceId: r.evidenceId, status: r.status, profileId: r.profileId }))
    .sort((a, b) => a.evidenceId.localeCompare(b.evidenceId)),
};

writeFileEnsured(summaryPath, JSON.stringify(summary, null, 2));
writeFileEnsured(
  join(EVIDENCE_ROOT, runId, "index.json"),
  JSON.stringify(records, null, 2),
);

console.log(`Evidence collected for ${runId}`);
console.log(
  `  pass ${counts.pass} · fail ${counts.fail} · unmeasured ${counts.unmeasured} · blocked ${counts.blocked} (total ${counts.total})`,
);
console.log(`  runs preserved: ${listRunIds().length}`);
