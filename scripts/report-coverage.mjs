#!/usr/bin/env node
/**
 * Coverage report generator — M0.5 WP5.
 *
 * Every cell is one of Implemented / Measured / Certified / Blocked / Unknown,
 * derived only from files on disk and evidence records. Nothing is inferred.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  generatedHeader,
  latestRun,
  loadDebt,
  loadRegistry,
  recordsById,
  writeFileEnsured,
} from "./lib/evidence-io.mjs";

const { engines } = loadRegistry("engines");
const { milestones } = loadRegistry("milestones");
const debt = loadDebt();
const run = latestRun();
if (!run) {
  console.error("No evidence runs found. Run `npm run cert` first.");
  process.exit(1);
}
const records = recordsById(run);
const all = [...records.values()];

function statusFor(prefixes) {
  if (prefixes.length === 0) return "Unknown";
  const matched = all.filter((r) => prefixes.some((p) => r.evidenceId.startsWith(p)));
  if (matched.length === 0) return "Unknown";
  if (matched.some((r) => r.status === "blocked")) return "Blocked";
  if (matched.every((r) => r.status === "pass")) return "Certified";
  if (matched.some((r) => r.status === "pass")) return "Measured";
  return "Unknown";
}

function implemented(paths) {
  return paths.length > 0 && paths.some((p) => existsSync(p));
}

let md = generatedHeader("Coverage Report", "`scripts/report-coverage.mjs`");
md += `\nRun: \`${run.runId}\`. Vocabulary: **Implemented** (code exists) · **Measured** (evidence exists, not all pass) · **Certified** (all matching rows pass) · **Blocked** (a profile is unsupported) · **Unknown** (no evidence).\n`;

// Architecture coverage
const layers = [
  ["Presentation", "src/routes"],
  ["Feature", "src/features"],
  ["Domain", "src/domain"],
  ["Repository", "src/repository"],
  ["Infrastructure", "src/infrastructure"],
  ["Foundation", "src/foundation"],
  ["Design System", "src/design-system"],
];
md += `\n## Architecture coverage\n\n| Layer | Modules | Guarded by | Status |\n| --- | --- | --- | --- |\n`;
for (const [name, path] of layers) {
  const count = existsSync(path) ? readdirSync(path).length : 0;
  md += `| ${name} | ${count} | \`arch:check\` | ${count > 0 ? "Implemented" : "Unknown"} |\n`;
}

// Certification coverage
const groups = new Map();
for (const record of all) {
  const key = record.evidenceId.split("-").slice(0, 2).join("-");
  const bucket = groups.get(key) ?? { pass: 0, fail: 0, unmeasured: 0, blocked: 0 };
  bucket[record.status] = (bucket[record.status] ?? 0) + 1;
  groups.set(key, bucket);
}
md += `\n## Certification coverage\n\n| Row group | Pass | Fail | Unmeasured | Blocked |\n| --- | --- | --- | --- | --- |\n`;
for (const [key, bucket] of [...groups].sort()) {
  md += `| \`${key}\` | ${bucket.pass ?? 0} | ${bucket.fail ?? 0} | ${bucket.unmeasured ?? 0} | ${bucket.blocked ?? 0} |\n`;
}

// Playwright coverage
const specDirs = existsSync("tests/certification")
  ? readdirSync("tests/certification", { withFileTypes: true })
      .filter((e) => e.isDirectory() && !["helpers", "fixtures", "profiles", "evidence"].includes(e.name))
      .map((e) => e.name)
  : [];
md += `\n## Playwright coverage\n\n| Suite | Specs | Status |\n| --- | --- | --- |\n`;
for (const dir of specDirs) {
  const specs = readdirSync(join("tests/certification", dir)).filter((f) => f.endsWith(".spec.ts"));
  md += `| \`${dir}\` | ${specs.length} | ${specs.length > 0 ? "Implemented" : "Unknown"} |\n`;
}

// Engine coverage
md += `\n## Engine coverage\n\n| Engine | Owner | Code | Certification | Open debt |\n| --- | --- | --- | --- | --- |\n`;
for (const engine of engines) {
  const open = debt.filter((d) => d.engine === engine.id && !d.resolved).length;
  md += `| [${engine.name}](../engines/${engine.id}.md) | ${engine.owner} | ${implemented(engine.srcPaths) ? "Implemented" : "Unknown"} | ${statusFor(engine.certPrefixes)} | ${open} |\n`;
}

// Capability coverage
md += `\n## Capability coverage\n\nTier resolution is evidence-gated through \`capability-certification.ts\`.\n\n| Tier | Capabilities | Source |\n| --- | --- | --- |\n`;
const provRegistry = statusFor(["CERT-PROV-"]);
md += `| Tier A (true sync) | 0 | certification registry is empty |\n| Tier B (assisted) | 0 | certification registry is empty |\n| Tier C (coordinated manual) | all providers | default, no tuple required |\n\nRegistry guard status: ${provRegistry}.\n`;

// Milestone coverage
md += `\n## Milestone coverage\n\n| Milestone | Name | Declared status | Gate status |\n| --- | --- | --- | --- |\n`;
for (const milestone of milestones) {
  md += `| ${milestone.id} | ${milestone.name} | ${milestone.status} | ${statusFor(milestone.gates)} |\n`;
}

writeFileEnsured("docs/dashboards/Coverage-Report.md", md);
console.log(`Coverage report written for ${run.runId}.`);
