#!/usr/bin/env node
/**
 * Evidence repository manager — M0.5 WP3, hardened in M0.6 (GATE-01 / GATE-02).
 *
 * Sealing state machine:
 *
 *   RUNNING -> PASSED | FAILED | BLOCKED | UNMEASURED | CANCELLED
 *
 * Rules enforced here:
 *  - Mandatory evidence (docs/registry/required-evidence.json) is validated
 *    BEFORE sealing. Missing evidence refuses the seal, writes a partial
 *    summary and a non-success index, and exits non-zero.
 *  - Schema validation always runs, including for an already sealed run.
 *  - A run with zero records, a missing mandatory record, an incomplete index
 *    or no completion marker is never successful.
 *  - CERT_FORCE_RUN=1 permits overwriting a sealed run; it never bypasses
 *    mandatory-evidence or schema validation.
 *
 * Usage: node scripts/evidence.mjs [--run <RUN-ID>]
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  COMPLETION_MARKER,
  EVIDENCE_ROOT,
  deriveRunState,
  ensureRunLayout,
  listRunIds,
  loadRun,
  missingRequiredEvidence,
  readJson,
  recordsById,
  schemaViolations,
  tally,
  writeFileEnsured,
} from "./lib/evidence-io.mjs";
import { runIdViolation } from "./lib/evidence-destination.mjs";
import {
  MANIFEST_FILE,
  artifactViolations,
  buildManifest,
  manifestViolations,
  readManifest,
} from "./lib/evidence-manifest.mjs";

const argRun = process.argv.includes("--run")
  ? process.argv[process.argv.indexOf("--run") + 1]
  : undefined;
const envRun = process.env["CERT_RUN_ID"];
const runId = argRun ?? envRun ?? listRunIds().at(-1);

if (!runId) {
  console.error("No evidence run found. Run `npm run cert` first.");
  process.exit(1);
}

// M1.18 (DEST-1): fail closed on an unsafe or ambiguous RUN-ID before any
// destination path is constructed. No evidence may be written outside the one
// authoritative root.
const runIdProblem = runIdViolation(runId);
if (runIdProblem) {
  console.error(`Refusing to resolve an evidence destination — ${runIdProblem}.`);
  process.exit(1);
}

const runDir = join(EVIDENCE_ROOT, runId);
const summaryPath = join(runDir, "summary.json");
const markerPath = join(runDir, COMPLETION_MARKER);
const existedBefore = existsSync(runDir);

if (!existedBefore) {
  // GATE-01: a run that does not exist is not an empty success.
  console.error(`Evidence run \`${runId}\` does not exist. Nothing to collect — refusing to seal.`);
  process.exit(1);
}

const existingSummary = readJson(summaryPath, null);
const forced = process.env["CERT_FORCE_RUN"] === "1";

ensureRunLayout(runId);
const run = loadRun(runId);
const records = [...recordsById(run).values()];
const counts = tally(records);
const runState = deriveRunState(counts);

/** Refuse the seal: partial summary, non-success index, no completion marker. */
function refuse(state, stage, reasons) {
  if (existsSync(markerPath)) rmSync(markerPath);
  const partial = {
    runId,
    sealed: false,
    runState: state,
    complete: false,
    refusedAtStage: stage,
    reasons,
    missingEvidence: reasons.missing ?? [],
    counts,
    collectedAt: new Date().toISOString(),
  };
  writeFileEnsured(summaryPath, JSON.stringify(partial, null, 2));
  writeFileEnsured(
    join(runDir, "index.json"),
    JSON.stringify({ runId, complete: false, runState: state, records }, null, 2),
  );
  console.error(`Evidence sealing refused for ${runId} — run state ${state} (stage: ${stage}).`);
  for (const line of reasons.detail) console.error(`  - ${line}`);
  process.exit(1);
}

// 1. Schema validation — always, sealed or not (GATE-02).
const violations = schemaViolations(records);
if (violations.length > 0) {
  refuse("FAILED", "schema-validation", { detail: violations });
}

// 2. Mandatory evidence completeness (GATE-01).
const missing = missingRequiredEvidence(records);
if (records.length === 0 || missing.length > 0) {
  refuse("BLOCKED", "mandatory-evidence-validation", {
    missing,
    detail:
      records.length === 0
        ? ["Run contains zero records; a run with no evidence can never be successful."]
        : missing.map((id) => `missing mandatory evidence: ${id}`),
  });
}

// 3. Pre-RET-1 runs sealed before the manifest contract existed are preserved
//    untouched; their retention state is reported, never rewritten.
const existingManifest = readManifest(runId);
if (existingSummary?.sealed && !existingManifest) {
  console.log(
    `Run ${runId} was sealed before the M1.17 manifest contract; preserved unchanged (no manifest).`,
  );
  process.exit(0);
}

// 4. RET-1 retention contract: exact source revision, work package, row
//    mapping, artifact manifest and a destination the repository really keeps.
const manifest = buildManifest({ runId, records, counts, runState });
const retentionProblems = [...manifestViolations(manifest), ...artifactViolations(runId, manifest)];
if (retentionProblems.length > 0) {
  refuse(runState === "PASSED" ? "BLOCKED" : runState, "retention-validation", {
    detail: retentionProblems,
  });
}

// 5. Already sealed and validated: preserve it byte-for-byte unless forced.
if (existingSummary?.sealed && !forced) {
  if (!existsSync(markerPath)) {
    writeFileEnsured(
      markerPath,
      JSON.stringify(
        {
          runId,
          complete: true,
          runState: existingSummary.runState ?? runState,
          sealedAt: existingSummary.collectedAt ?? new Date().toISOString(),
          counts: existingSummary.counts ?? counts,
          sourceRevision: existingManifest.sourceRevision?.sha ?? null,
          workPackage: existingManifest.workPackage ?? null,
        },
        null,
        2,
      ),
    );
    console.log(`Run ${runId} was sealed and valid; completion marker restored.`);
  } else {
    console.log(`Run ${runId} is sealed and valid; evidence preserved unchanged.`);
  }
  process.exit(0);
}

// 6. Seal. Order is load-bearing: manifest, then index, then summary, and the
//    completion marker strictly last — an interrupted seal stays incomplete.
const summary = {
  runId,
  sealed: true,
  runState,
  complete: true,
  commit: records[0]?.commit ?? "unknown",
  sourceRevision: manifest.sourceRevision.sha,
  workPackage: manifest.workPackage,
  engines: manifest.engines,
  environmentProfile: records[0]?.environmentProfile ?? "unknown",
  region: records[0]?.region ?? "unknown",
  retention: manifest.retention,
  manifest: MANIFEST_FILE,
  collectedAt: new Date().toISOString(),
  counts,
  rows: records
    .map((r) => ({ evidenceId: r.evidenceId, status: r.status, profileId: r.profileId }))
    .sort((a, b) => a.evidenceId.localeCompare(b.evidenceId)),
};

writeFileEnsured(join(runDir, MANIFEST_FILE), JSON.stringify(manifest, null, 2));
writeFileEnsured(
  join(runDir, "index.json"),
  JSON.stringify(
    {
      runId,
      complete: true,
      runState,
      sourceRevision: manifest.sourceRevision.sha,
      workPackage: manifest.workPackage,
      engines: manifest.engines,
      destination: manifest.retention.destination,
      manifest: MANIFEST_FILE,
      records,
    },
    null,
    2,
  ),
);
writeFileEnsured(summaryPath, JSON.stringify(summary, null, 2));
writeFileEnsured(
  markerPath,
  JSON.stringify(
    {
      runId,
      complete: true,
      runState,
      sealedAt: summary.collectedAt,
      counts,
      sourceRevision: manifest.sourceRevision.sha,
      workPackage: manifest.workPackage,
      manifest: MANIFEST_FILE,
    },
    null,
    2,
  ),
);

console.log(`Evidence collected for ${runId} — run state ${runState}`);
console.log(
  `  pass ${counts.pass} · fail ${counts.fail} · unmeasured ${counts.unmeasured} · blocked ${counts.blocked} (total ${counts.total})`,
);
console.log(`  runs preserved: ${listRunIds().length}`);
