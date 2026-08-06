#!/usr/bin/env node
/**
 * Certification gate self-test — M0.6.
 *
 * Exercises the three remediated failure paths against isolated fixtures in a
 * temporary evidence root. No real run is created, mutated or deleted.
 *
 *   GATE-01  missing / empty evidence must refuse the seal
 *   GATE-02  malformed evidence must be rejected even when already sealed
 *   GATE-03  environment-caused failures classify as `blocked`, never `fail`
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { classifyStageFailure } from "./lib/result-state.mjs";

const EVIDENCE_ROOT = "tests/certification/evidence";
const FIXTURES = "tests/certification/fixtures/gates";
const failures = [];

function check(name, condition, detail) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) failures.push(`${name} — ${detail}`);
}

function runEvidence(runId) {
  const result = spawnSync("node", ["scripts/evidence.mjs", "--run", runId], { encoding: "utf8" });
  return { code: result.status, output: `${result.stdout}${result.stderr}` };
}

const staged = [];
function stage(fixtureName, runId) {
  const dir = join(EVIDENCE_ROOT, runId);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(join(FIXTURES, fixtureName), dir, { recursive: true });
  staged.push(dir);
  return dir;
}

try {
  // GATE-01a — a run directory that does not exist.
  const ghost = runEvidence("RUN-SELFTEST-GHOST");
  check("GATE-01 non-existent run refuses", ghost.code !== 0, `exit ${ghost.code}`);
  check(
    "GATE-01 non-existent run creates nothing",
    !existsSync(join(EVIDENCE_ROOT, "RUN-SELFTEST-GHOST")),
    "an empty run directory was created",
  );

  // GATE-01b — a run with zero records.
  const emptyDir = stage("empty-run", "RUN-SELFTEST-EMPTY");
  const empty = runEvidence("RUN-SELFTEST-EMPTY");
  const emptySummary = JSON.parse(readFileSync(join(emptyDir, "summary.json"), "utf8"));
  check("GATE-01 empty run refuses", empty.code !== 0, `exit ${empty.code}`);
  check("GATE-01 empty run not sealed", emptySummary.sealed === false, "summary claims sealed");
  check(
    "GATE-01 empty run has no completion marker",
    !existsSync(join(emptyDir, "completed.json")),
    "completion marker written",
  );

  // GATE-01c — mandatory record missing from an otherwise valid run.
  const partialDir = stage("missing-mandatory-run", "RUN-SELFTEST-MISSING");
  const partial = runEvidence("RUN-SELFTEST-MISSING");
  const partialSummary = JSON.parse(readFileSync(join(partialDir, "summary.json"), "utf8"));
  check("GATE-01 missing mandatory refuses", partial.code !== 0, `exit ${partial.code}`);
  check(
    "GATE-01 missing identifiers recorded",
    Array.isArray(partialSummary.missingEvidence) && partialSummary.missingEvidence.length > 0,
    "no missing identifiers recorded",
  );
  check(
    "GATE-01 refusing stage recorded",
    partialSummary.refusedAtStage === "mandatory-evidence-validation",
    `stage: ${partialSummary.refusedAtStage}`,
  );
  check(
    "GATE-01 index marked non-success",
    JSON.parse(readFileSync(join(partialDir, "index.json"), "utf8")).complete === false,
    "index does not declare incompleteness",
  );

  // GATE-01d — CERT_FORCE_RUN may not bypass mandatory validation.
  const forced = spawnSync("node", ["scripts/evidence.mjs", "--run", "RUN-SELFTEST-MISSING"], {
    encoding: "utf8",
    env: { ...process.env, CERT_FORCE_RUN: "1" },
  });
  check("GATE-01 CERT_FORCE_RUN cannot force a pass", forced.status !== 0, `exit ${forced.status}`);

  // GATE-02 — malformed record inside an already sealed run.
  const malformedDir = stage("malformed-sealed-run", "RUN-SELFTEST-MALFORMED");
  const malformed = runEvidence("RUN-SELFTEST-MALFORMED");
  check("GATE-02 sealed run still validated", malformed.code !== 0, `exit ${malformed.code}`);
  check(
    "GATE-02 seal revoked on malformed record",
    JSON.parse(readFileSync(join(malformedDir, "summary.json"), "utf8")).sealed === false,
    "run remained sealed",
  );

  // GATE-03 — classification of environment vs product failures.
  const browserMissing = classifyStageFailure(
    "browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium/chrome",
  );
  check(
    "GATE-03 missing browser is blocked",
    browserMissing.state === "blocked",
    browserMissing.state,
  );
  const assertionFailure = classifyStageFailure(
    "1 failed\n  CERT-SA-01 server authority › expected 200, received 403",
  );
  check(
    "GATE-03 assertion failure stays fail",
    assertionFailure.state === "fail",
    assertionFailure.state,
  );
  check(
    "GATE-03 clean stage is not downgraded",
    classifyStageFailure("").state === "fail",
    "clean output downgraded",
  );
} finally {
  for (const dir of staged) rmSync(dir, { recursive: true, force: true });
  rmSync(join(EVIDENCE_ROOT, "RUN-SELFTEST-GHOST"), { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\nCertification gate self-test FAILED (${failures.length}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\nCertification gate self-test passed (GATE-01, GATE-02, GATE-03).");
