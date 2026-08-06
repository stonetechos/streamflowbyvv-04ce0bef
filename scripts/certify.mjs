#!/usr/bin/env node
/**
 * Certification pipeline runner — M0.5 WP2.
 *
 * One command, fixed deterministic stage order:
 *   verify -> architecture guard -> certification guard -> playwright
 *   -> certification matrix -> performance baselines -> evidence collection
 *   -> summary -> release recommendation
 *
 * A failing stage short-circuits the remainder but still writes a partial
 * summary, so a broken run is still evidence.
 */
import { spawnSync } from "node:child_process";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { EVIDENCE_ROOT, ensureRunLayout, writeFileEnsured } from "./lib/evidence-io.mjs";

function safeExec(command, fallback) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return fallback;
  }
}

const COMMIT = process.env["CERT_COMMIT"] ?? safeExec("git rev-parse --short HEAD", "unknown");
const STARTED_AT = new Date().toISOString();
const RUN_ID =
  process.env["CERT_RUN_ID"] ?? `RUN-${STARTED_AT.replace(/[-:]/g, "").slice(0, 13)}-${COMMIT}`;
process.env["CERT_RUN_ID"] = RUN_ID;
process.env["CERT_COMMIT"] = COMMIT;
process.env["CERT_RUN_STARTED_AT"] = STARTED_AT;

const SKIP_PLAYWRIGHT = process.argv.includes("--no-browser") || process.env["CERT_SKIP_PLAYWRIGHT"] === "1";

const stages = [
  { id: "format", label: "Format check", command: "npx", args: ["prettier", "--check", "."] },
  { id: "lint", label: "Lint", command: "npx", args: ["eslint", ".", "--max-warnings", "25"] },
  { id: "architecture", label: "Architecture guard", command: "node", args: ["scripts/check-architecture.mjs"] },
  { id: "adrs", label: "ADR validation", command: "node", args: ["scripts/check-adrs.mjs"] },
  { id: "cert-guard", label: "Certification guard", command: "node", args: ["scripts/check-certification.mjs"] },
  {
    id: "playwright",
    label: "Playwright certification matrix",
    command: "npx",
    args: ["playwright", "test"],
    skip: SKIP_PLAYWRIGHT,
    skipReason: "Browser stage skipped (--no-browser).",
  },
  { id: "evidence", label: "Evidence collection", command: "node", args: ["scripts/evidence.mjs"] },
  { id: "performance", label: "Performance baselines", command: "node", args: ["scripts/report-performance.mjs"] },
  { id: "coverage", label: "Coverage report", command: "node", args: ["scripts/report-coverage.mjs"] },
  { id: "engines", label: "Engine health", command: "node", args: ["scripts/report-engines.mjs"] },
  { id: "debt", label: "Technical debt dashboard", command: "node", args: ["scripts/report-debt.mjs"] },
  { id: "milestone", label: "Milestone coverage", command: "node", args: ["scripts/milestone.mjs"] },
  { id: "release", label: "Release recommendation", command: "node", args: ["scripts/report-release.mjs"] },
];

ensureRunLayout(RUN_ID);
const results = [];
let halted = false;

console.log(`Certification pipeline — run ${RUN_ID} @ ${COMMIT}\n`);

for (const stage of stages) {
  if (halted) {
    results.push({ id: stage.id, label: stage.label, status: "skipped", exitCode: null, detail: "Earlier stage failed." });
    continue;
  }
  if (stage.skip) {
    results.push({ id: stage.id, label: stage.label, status: "skipped", exitCode: null, detail: stage.skipReason });
    console.log(`- ${stage.label}: skipped (${stage.skipReason})`);
    continue;
  }
  const startedAt = new Date().toISOString();
  const result = spawnSync(stage.command, stage.args, { stdio: "inherit", env: process.env });
  const exitCode = result.status ?? 1;
  const status = exitCode === 0 ? "pass" : "fail";
  results.push({
    id: stage.id,
    label: stage.label,
    status,
    exitCode,
    startedAt,
    finishedAt: new Date().toISOString(),
  });
  console.log(`- ${stage.label}: ${status} (exit ${exitCode})\n`);
  if (status === "fail") halted = true;
}

const summary = {
  runId: RUN_ID,
  commit: COMMIT,
  startedAt: STARTED_AT,
  finishedAt: new Date().toISOString(),
  environmentProfile: process.env["CERT_ENVIRONMENT"] ?? "local-dev",
  region: process.env["CERT_REGION"] ?? "unknown",
  complete: !halted,
  stages: results,
};

writeFileEnsured(join(EVIDENCE_ROOT, RUN_ID, "reports", "pipeline.json"), JSON.stringify(summary, null, 2));

const table = results
  .map((stage) => `| ${stage.label} | ${stage.status} | ${stage.exitCode ?? "-"} |`)
  .join("\n");
writeFileEnsured(
  join(EVIDENCE_ROOT, RUN_ID, "reports", "pipeline.md"),
  `# Certification Pipeline — ${RUN_ID}\n\nCommit \`${COMMIT}\`, started ${STARTED_AT}.\n\n| Stage | Status | Exit |\n| --- | --- | --- |\n${table}\n\nPipeline complete: ${!halted}\n`,
);

console.log(`\nPipeline ${halted ? "FAILED" : "completed"}. Evidence: ${join(EVIDENCE_ROOT, RUN_ID)}`);
process.exit(halted ? 1 : 0);
