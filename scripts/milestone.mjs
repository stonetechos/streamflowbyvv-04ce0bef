#!/usr/bin/env node
/**
 * Milestone coverage — M0.5 WP10.
 *
 * Compares each Constitution milestone's gate rows against the newest evidence
 * run. A gate with no evidence is Unknown, never satisfied.
 */
import {
  generatedHeader,
  latestRun,
  loadRegistry,
  recordsById,
  writeFileEnsured,
} from "./lib/evidence-io.mjs";

const { milestones } = loadRegistry("milestones");
const run = latestRun();
if (!run) {
  console.error("No evidence runs found. Run `npm run cert` first.");
  process.exit(1);
}
const all = [...recordsById(run).values()];

let md = generatedHeader("Milestone Coverage", "`scripts/milestone.mjs`");
md += `\nRun \`${run.runId}\`. A gate row that did not execute is **Unknown** and does not satisfy a Definition of Done.\n\n`;

const lines = [];
for (const milestone of milestones) {
  const rows = all.filter((r) => milestone.gates.some((g) => r.evidenceId.startsWith(g)));
  const pass = rows.filter((r) => r.status === "pass").length;
  const blocked = rows.filter((r) => r.status === "blocked").length;
  const gate =
    milestone.gates.length === 0
      ? "Unknown (no gate declared)"
      : rows.length === 0
        ? "Unknown (no evidence)"
        : rows.some((r) => r.status === "fail")
          ? "Failing"
          : blocked > 0
            ? `Blocked (${blocked})`
            : pass === rows.length
              ? "Satisfied"
              : "Partial";
  lines.push(
    `| ${milestone.id} | ${milestone.name} | ${milestone.status} | ${rows.length} | ${pass} | ${gate} |`,
  );
  console.log(`${milestone.id.padEnd(5)} ${milestone.status.padEnd(12)} gate: ${gate}`);
}

md += `| Milestone | Name | Declared | Gate rows | Pass | Gate status |\n| --- | --- | --- | --- | --- | --- |\n${lines.join("\n")}\n`;
writeFileEnsured("docs/dashboards/Milestone-Coverage.md", md);
