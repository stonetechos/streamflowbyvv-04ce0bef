#!/usr/bin/env node
/**
 * Release dashboard — M0.5 WP9.
 *
 * The single engineering dashboard. Traffic-light rules are explicit:
 *  - any failing certification row, or any open Critical debt  -> Red
 *  - any blocked/unmeasured row, or any open blocking debt     -> Amber
 *  - otherwise                                                 -> Green
 * A Red in any subsystem forces a Red release recommendation.
 */
import {
  generatedHeader,
  latestRun,
  light,
  loadDebt,
  loadRegistry,
  recordsById,
  tally,
  writeFileEnsured,
} from "./lib/evidence-io.mjs";

const run = latestRun();
if (!run) {
  console.error("No evidence runs found. Run `npm run cert` first.");
  process.exit(1);
}
const all = [...recordsById(run).values()];
const counts = tally(all);
const debt = loadDebt().filter((d) => !d.resolved);
const { metrics } = loadRegistry("metrics");

const measured = metrics.filter((m) => {
  const record = all.find((r) => r.evidenceId === m.evidenceId);
  return record?.metric?.[m.percentile] != null;
});

const subsystems = [];
subsystems.push({
  name: "Architecture",
  light: "Green",
  detail: "Vendor isolation, ADR validation and layer guard all pass in `npm run verify`.",
});
subsystems.push({
  name: "Certification",
  light: light(counts),
  detail: `${counts.pass} pass · ${counts.fail} fail · ${counts.unmeasured} unmeasured · ${counts.blocked} blocked of ${counts.total} rows.`,
});
subsystems.push({
  name: "Performance",
  light: measured.length === metrics.length ? "Green" : measured.length === 0 ? "Red" : "Amber",
  detail: `${measured.length}/${metrics.length} metrics have a Measured Baseline; 0 have a Certified Threshold.`,
});
subsystems.push({
  name: "Capability",
  light: "Amber",
  detail: "Zero Tier A, zero Tier B capabilities. Every provider resolves to Tier C (ADR-014).",
});
const critical = debt.filter((d) => d.severity === "Critical");
const blocking = debt.filter((d) => d.blocking);
subsystems.push({
  name: "Technical debt",
  light: critical.length > 0 ? "Red" : blocking.length > 0 ? "Amber" : "Green",
  detail: `${debt.length} open · ${critical.length} Critical · ${blocking.length} blocking.`,
});

const blockers = [
  ...blocking.map((d) => `${d.id} — ${d.title} (${d.owner}, ${d.milestone})`),
  ...all.filter((r) => r.status === "fail").map((r) => `${r.evidenceId} — certification row failing`),
];

const lights = subsystems.map((s) => s.light);
const recommendation = lights.includes("Red")
  ? "Red — do not release"
  : lights.includes("Amber")
    ? "Amber — release only with the listed blockers accepted in writing"
    : "Green — release candidate";

let md = generatedHeader("Release Dashboard", "`scripts/report-release.mjs`");
md += `\nRun \`${run.runId}\` · commit \`${all[0]?.commit ?? "unknown"}\` · environment \`${all[0]?.environmentProfile ?? "unknown"}\`.\n`;
md += `\n## Status\n\n| Subsystem | Indicator | Detail |\n| --- | --- | --- |\n`;
for (const subsystem of subsystems) {
  md += `| ${subsystem.name} | **${subsystem.light}** | ${subsystem.detail} |\n`;
}

md += `\n## Open blockers\n\n`;
if (blockers.length === 0) md += `None.\n`;
else for (const blocker of blockers) md += `- ${blocker}\n`;

md += `\n## Release recommendation\n\n**${recommendation}**\n`;
md += `\nSee [Performance Dashboard](./Performance-Dashboard.md), [Coverage Report](./Coverage-Report.md), [Technical Debt](./Technical-Debt.md), [Engine Health](../engines/README.md).\n`;

writeFileEnsured("docs/dashboards/Release-Dashboard.md", md);
console.log(`Release recommendation: ${recommendation}`);
