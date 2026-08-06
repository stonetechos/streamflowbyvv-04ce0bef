#!/usr/bin/env node
/**
 * Engine health reports — M0.5 WP7.
 *
 * One report per Domain Engine plus the Experience Subsystem, generated from
 * docs/registry/engines.json, docs/debt/debt-register.json and the newest
 * evidence run. No metric is invented; missing data reads Unknown.
 */
import { existsSync } from "node:fs";
import {
  generatedHeader,
  latestRun,
  loadDebt,
  loadRegistry,
  recordsById,
  writeFileEnsured,
} from "./lib/evidence-io.mjs";

const { engines } = loadRegistry("engines");
const debt = loadDebt();
const run = latestRun();
if (!run) {
  console.error("No evidence runs found. Run `npm run cert` first.");
  process.exit(1);
}
const all = [...recordsById(run).values()];

function rowsFor(engine) {
  return all.filter((r) => engine.certPrefixes.some((p) => r.evidenceId.startsWith(p)));
}

function statusOf(engine, rows, openDebt) {
  if (engine.srcPaths.length === 0) return "Not implemented";
  if (rows.length === 0) return "Implemented · Unknown certification";
  if (rows.some((r) => r.status === "fail")) return "Failing";
  if (rows.some((r) => r.status === "blocked")) return "Blocked";
  if (openDebt.some((d) => d.blocking)) return "Certified · blocking debt open";
  return rows.every((r) => r.status === "pass") ? "Certified" : "Measured";
}

const index = [];

for (const engine of engines) {
  const rows = rowsFor(engine);
  const openDebt = debt.filter((d) => d.engine === engine.id && !d.resolved);
  const status = statusOf(engine, rows, openDebt);
  index.push({ engine, status, rows: rows.length, openDebt: openDebt.length });

  let md = generatedHeader(`${engine.name} — Engine Health`, "`scripts/report-engines.mjs`");
  md += `\n**Id** \`${engine.id}\` · **Owner** ${engine.owner} · **Status** ${status} · **Evidence run** \`${run.runId}\`\n`;

  md += `\n## Module coverage\n\n| Path | Present |\n| --- | --- |\n`;
  if (engine.srcPaths.length === 0) md += `| _no modules mapped_ | Unknown |\n`;
  for (const path of engine.srcPaths)
    md += `| \`${path}\` | ${existsSync(path) ? "yes" : "missing"} |\n`;

  md += `\n## Certification\n\n`;
  if (rows.length === 0) {
    md += `No certification row targets this engine. Coverage is **Unknown**, not pass.\n`;
  } else {
    md += `| Row | Profile | Status | Detail |\n| --- | --- | --- | --- |\n`;
    for (const row of rows.sort((a, b) => a.evidenceId.localeCompare(b.evidenceId))) {
      md += `| \`${row.evidenceId}\` | ${row.profileId} | ${row.status} | ${(row.detail ?? "").replace(/\|/g, "/")} |\n`;
    }
  }

  md += `\n## Technical debt\n\n`;
  if (openDebt.length === 0) md += `No open items.\n`;
  else {
    md += `| Id | Severity | Milestone | Blocking | Item |\n| --- | --- | --- | --- | --- |\n`;
    for (const item of openDebt) {
      md += `| ${item.id} | ${item.severity} | ${item.milestone} | ${item.blocking ? "yes" : "no"} | ${item.title} |\n`;
    }
  }

  md += `\n## Known risks\n\n`;
  for (const risk of engine.risks) md += `- ${risk}\n`;
  if (engine.risks.length === 0) md += `- None recorded.\n`;

  writeFileEnsured(`docs/engines/${engine.id}.md`, md);
}

let readme = generatedHeader("Engine Health Index", "`scripts/report-engines.mjs`");
readme += `\nRun \`${run.runId}\`. One report per Constitution engine plus the Experience Subsystem.\n\n| Engine | Owner | Certification rows | Open debt | Status |\n| --- | --- | --- | --- | --- |\n`;
for (const entry of index) {
  readme += `| [${entry.engine.name}](./${entry.engine.id}.md) | ${entry.engine.owner} | ${entry.rows} | ${entry.openDebt} | ${entry.status} |\n`;
}
writeFileEnsured("docs/engines/README.md", readme);

console.log(`Engine health reports written: ${engines.length} reports + index.`);
