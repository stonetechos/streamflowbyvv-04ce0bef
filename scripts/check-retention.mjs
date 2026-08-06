#!/usr/bin/env node
/**
 * Retention self-test — M1.17 (RET-1).
 *
 * Proves the evidence-retention contract without executing certification: no
 * Playwright run, no certification row is promoted, no real run is sealed,
 * mutated or deleted. All fixtures live under `RUN-RETSELFTEST-*`, carry the
 * `retention-selftest` environment profile, and are removed in `finally`, so
 * they can never be mistaken for certification evidence.
 *
 * Coverage (docs/certification/Evidence-Retention-Contract.md):
 *   R1  unique RUN-ID, no overwrite of an existing sealed run
 *   R2  exact source revision captured and retained
 *   R3  certification rows and owning engines mapped in the manifest
 *   R4  required evidence written to the durable destination
 *   R5  completion marker written last
 *   R6  missing artifact prevents completion
 *   R7  missing manifest prevents sealing
 *   R8  missing source revision prevents sealing
 *   R9  missing row mapping prevents sealing
 *   R10 index entries point to artifacts that exist
 *   R11 incomplete runs are visibly incomplete
 *   R12 no historical M1 run is recreated
 *   R13 the retention path is not excluded by an active ignore rule
 *   R14 a retained run is discoverable from the repository review path
 *
 * M1.18 (DEST-1) destination coverage, same fixtures, same guarantees:
 *   D1  exactly one authoritative evidence root is declared repository-wide
 *   D2  every required evidence type resolves beneath that one root
 *   D3  an unsafe or traversing RUN-ID is refused before any path is built
 *   D4  manifest, index, summary and marker agree on the destination
 *   D5  a RUN-ID lookup locates run metadata deterministically
 *   D6  a certification-row lookup locates the run beneath the same root
 *   D7  a source-revision lookup locates the run beneath the same root
 *   D8  generated runner workspace output is never presented as retained evidence
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { EVIDENCE_ROOT, listRunIds, loadRequiredEvidence } from "./lib/evidence-io.mjs";
import { destinationStatus, RETAINED_SUBDIRS } from "./lib/evidence-manifest.mjs";
import {
  EVIDENCE_ROOT as AUTHORITATIVE_ROOT,
  competingRoots,
  runIdViolation,
  runPaths,
} from "./lib/evidence-destination.mjs";

const failures = [];
const staged = [];

function check(name, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) failures.push(`${name} — ${detail}`);
}

function readJsonFile(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Synthesize a complete, schema-valid record set for a throwaway run. */
function stageRun(runId, { workPackage = "WP-RETENTION-SELFTEST" } = {}) {
  const recordWorkPackage = workPackage || undefined;
  const dir = join(EVIDENCE_ROOT, runId);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "records"), { recursive: true });
  staged.push(dir);
  for (const entry of loadRequiredEvidence()) {
    const evidenceId = entry.match === "prefix" ? `${entry.id}selftest` : entry.id;
    writeFileSync(
      join(dir, "records", `${evidenceId}.json`),
      `${JSON.stringify(
        {
          evidenceId,
          runId,
          commit: "selftest",
          environmentProfile: "retention-selftest",
          region: "selftest",
          profileId: "PROF-SELFTEST",
          browser: "none",
          platform: "none",
          status: "unmeasured",
          ...(recordWorkPackage ? { workPackage: recordWorkPackage } : {}),
          detail: "Retention self-test fixture. Not certification evidence.",
          measuredAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }
  return dir;
}

function runEvidence(runId, env = {}) {
  const result = spawnSync("node", ["scripts/evidence.mjs", "--run", runId], {
    encoding: "utf8",
    env: { ...process.env, CERT_WORK_PACKAGE: "WP-RETENTION-SELFTEST", ...env },
  });
  return { code: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

const historicalBefore = listRunIds();

try {
  // --- Happy path: a fully retained run -----------------------------------
  const okId = "RUN-RETSELFTEST-A";
  const okDir = stageRun(okId);
  const sealed = runEvidence(okId);
  check("R4 complete run seals", sealed.code === 0, sealed.output);

  const manifestPath = join(okDir, "manifest.json");
  check("R4 manifest written to the durable destination", existsSync(manifestPath));
  const manifest = existsSync(manifestPath) ? readJsonFile(manifestPath) : {};

  check(
    "R2 manifest binds an exact 40-character source revision",
    /^[0-9a-f]{40}$/.test(manifest.sourceRevision?.sha ?? ""),
    String(manifest.sourceRevision?.sha),
  );
  check(
    "R3 manifest maps every row to an owning engine",
    (manifest.rows ?? []).length > 0 && (manifest.rows ?? []).every((row) => row.engine),
  );
  check("R3 manifest records the work package", manifest.workPackage === "WP-RETENTION-SELFTEST");
  check("R1 manifest carries the run identity", manifest.runId === okId);
  check(
    "R4 manifest lists artifacts with digests",
    (manifest.artifacts ?? []).length > 0 &&
      manifest.artifacts.every((a) => /^[0-9a-f]{64}$/.test(a.sha256)),
  );
  check(
    "R10 every manifest artifact exists on disk",
    (manifest.artifacts ?? []).every((a) => existsSync(join(okDir, a.path))),
  );

  const summary = readJsonFile(join(okDir, "summary.json"));
  const marker = readJsonFile(join(okDir, "completed.json"));
  const index = readJsonFile(join(okDir, "index.json"));
  check(
    "R1 run identity is present in index and completion marker",
    index.runId === okId && marker.runId === okId,
  );
  check(
    "R2 revision is present in summary, index and marker",
    summary.sourceRevision === manifest.sourceRevision.sha &&
      index.sourceRevision === manifest.sourceRevision.sha &&
      marker.sourceRevision === manifest.sourceRevision.sha,
  );
  check(
    "R5 completion marker is written last",
    statSync(join(okDir, "completed.json")).mtimeMs >= statSync(manifestPath).mtimeMs,
  );
  check(
    "R13 retained destination is not excluded by an ignore rule",
    destinationStatus(okId).durable === true,
    JSON.stringify(destinationStatus(okId)),
  );
  check(
    "R14 retained run is discoverable from the repository review path",
    listRunIds().includes(okId) && summary.retention?.destination === `${EVIDENCE_ROOT}/${okId}`,
  );

  // --- R1: a second run may not overwrite the first ------------------------
  const secondId = "RUN-RETSELFTEST-B";
  stageRun(secondId);
  runEvidence(secondId);
  const okAfter = readJsonFile(join(okDir, "summary.json"));
  check(
    "R1 a second run does not overwrite the first",
    okAfter.collectedAt === summary.collectedAt && listRunIds().includes(secondId),
  );

  // --- R6: a missing artifact prevents completion --------------------------
  const missingArtifactId = "RUN-RETSELFTEST-MISSING-ARTIFACT";
  const missingArtifactDir = stageRun(missingArtifactId);
  runEvidence(missingArtifactId);
  rmSync(join(missingArtifactDir, "records", "CERT-SA-01.json"));
  const artifactGone = runEvidence(missingArtifactId);
  check("R6 a missing artifact refuses the seal", artifactGone.code !== 0, artifactGone.output);
  check(
    "R11 a refused run is visibly incomplete",
    readJsonFile(join(missingArtifactDir, "summary.json")).sealed === false &&
      readJsonFile(join(missingArtifactDir, "index.json")).complete === false &&
      !existsSync(join(missingArtifactDir, "completed.json")),
  );

  // --- R7: no manifest, no seal -------------------------------------------
  const noManifestId = "RUN-RETSELFTEST-NO-MANIFEST";
  const noManifestDir = stageRun(noManifestId, { workPackage: "" });
  const noWp = runEvidence(noManifestId, { CERT_WORK_PACKAGE: "" });
  check(
    "R7/R9 a run without a work-package mapping refuses the seal",
    noWp.code !== 0 && !existsSync(join(noManifestDir, "manifest.json")),
    noWp.output,
  );
  check(
    "R7 no completion marker is written when sealing is refused",
    !existsSync(join(noManifestDir, "completed.json")),
  );

  // --- R8: no exact revision, no seal --------------------------------------
  const noRevId = "RUN-RETSELFTEST-NO-REVISION";
  stageRun(noRevId);
  const noRev = runEvidence(noRevId, { CERT_COMMIT_SHA: "latest" });
  check("R8 an inexact source revision refuses the seal", noRev.code !== 0, noRev.output);

  // --- D1-D8: DEST-1 destination authority (M1.18) -------------------------
  const competing = competingRoots();
  check(
    "D1 exactly one authoritative evidence root is declared repository-wide",
    competing.length === 0,
    competing.map((c) => `${c.file}: ${c.value}`).join(", "),
  );
  check(
    "D1 the authoritative root is the retention destination root",
    AUTHORITATIVE_ROOT === EVIDENCE_ROOT,
  );

  const paths = runPaths(okId);
  check(
    "D2 every required evidence path resolves beneath the one root",
    [
      paths.runDir,
      paths.manifest,
      paths.index,
      paths.summary,
      paths.completionMarker,
      paths.records,
      paths.metrics,
      paths.reports,
      paths.screenshots,
      paths.logs,
    ].every((p) => p.split("\\").join("/").startsWith(`${AUTHORITATIVE_ROOT}/`)),
  );
  check(
    "D2 manifest, index, summary and marker exist at the resolved paths",
    [paths.manifest, paths.index, paths.summary, paths.completionMarker].every((p) =>
      existsSync(p),
    ),
  );

  check(
    "D3 traversing and unsafe RUN-IDs are rejected by the resolver",
    ["../escape", "a/b", "..", "", "/abs"].every((id) => runIdViolation(id) !== null) &&
      runIdViolation(okId) === null,
  );
  const traversal = runEvidence("../RUN-RETSELFTEST-ESCAPE");
  check(
    "D3 sealing refuses an unsafe RUN-ID and writes nothing outside the root",
    traversal.code !== 0 && !existsSync(join(EVIDENCE_ROOT, "..", "RUN-RETSELFTEST-ESCAPE")),
    traversal.output,
  );

  check(
    "D4 manifest, summary and index agree on one destination",
    manifest.retention?.destination === paths.reviewPath &&
      summary.retention?.destination === paths.reviewPath &&
      index.destination === paths.reviewPath,
    `${manifest.retention?.destination} / ${summary.retention?.destination} / ${index.destination}`,
  );

  check(
    "D5 a RUN-ID lookup locates run metadata deterministically",
    readJsonFile(paths.manifest).runId === okId && readJsonFile(paths.summary).runId === okId,
  );
  const rowId = manifest.rows[0].evidenceId;
  check(
    "D6 a certification-row lookup locates the run beneath the same root",
    existsSync(join(paths.runDir, `records/${rowId}.json`)) &&
      manifest.rows.every((row) => row.record.startsWith("records/")),
  );
  check(
    "D7 a source-revision lookup locates the run beneath the same root",
    marker.sourceRevision === manifest.sourceRevision.sha &&
      readJsonFile(paths.index).sourceRevision === manifest.sourceRevision.sha,
  );
  check(
    "D8 generated runner workspace output is not presented as retained evidence",
    manifest.artifacts.every((a) => RETAINED_SUBDIRS.some((sub) => a.path.startsWith(`${sub}/`))) &&
      !manifest.artifacts.some(
        (a) => a.path.startsWith("videos/") || a.path.startsWith("artifacts/"),
      ),
  );

  // --- R12: no historical M1 run is recreated ------------------------------
  check(
    "R12 no historical M1 run was created by this self-test",
    listRunIds().every((id) => !id.startsWith("RUN-M1")),
    listRunIds().join(", "),
  );
} finally {
  for (const dir of staged) rmSync(dir, { recursive: true, force: true });
}

const historicalAfter = listRunIds();
check(
  "R12 pre-existing runs are untouched",
  historicalBefore.join(",") === historicalAfter.join(","),
  `${historicalBefore.join(",")} -> ${historicalAfter.join(",")}`,
);

if (failures.length > 0) {
  console.error(`\nRetention self-test FAILED (${failures.length}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\nRetention self-test passed (RET-1 contract R1-R14, DEST-1 destination D1-D8).");
