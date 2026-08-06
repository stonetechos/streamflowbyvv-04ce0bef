#!/usr/bin/env node
/**
 * Technical debt dashboard — M0.5 WP8.
 *
 * Generated from docs/debt/debt-register.json. Also acts as a guard: a
 * malformed or unlinked entry fails the run.
 */
import { readdirSync } from "node:fs";
import { generatedHeader, loadDebt, loadRegistry, writeFileEnsured } from "./lib/evidence-io.mjs";

/** Every ADR id that resolves to a committed decision record. */
const KNOWN_ADRS = new Set([
  ...readdirSync("docs/adr"),
  ...readdirSync("docs/blueprint"),
].flatMap((name) => (name.match(/ADR-\d{3}/) ?? [])));


const items = loadDebt();
const { engines } = loadRegistry("engines");
const { milestones } = loadRegistry("milestones");
const engineIds = new Set(engines.map((e) => e.id));
const milestoneIds = new Set(milestones.map((m) => m.id));
const SEVERITY = ["Critical", "High", "Medium", "Low"];

const violations = [];
const seen = new Set();
for (const item of items) {
  const where = item.id ?? "<no id>";
  if (!/^DEBT-\d{3}$/.test(item.id ?? "")) violations.push(`${where}: invalid id format.`);
  if (seen.has(item.id)) violations.push(`${where}: duplicate id.`);
  seen.add(item.id);
  if (!SEVERITY.includes(item.severity)) violations.push(`${where}: severity must be one of ${SEVERITY.join("/")}.`);
  if (!item.owner) violations.push(`${where}: missing owner.`);
  if (!milestoneIds.has(item.milestone)) violations.push(`${where}: milestone "${item.milestone}" is not in the milestone registry.`);
  if (!item.impact) violations.push(`${where}: missing impact.`);
  if (!item.effort) violations.push(`${where}: missing estimated effort.`);
  if (typeof item.blocking !== "boolean") violations.push(`${where}: blocking must be a boolean.`);
  if (!engineIds.has(item.engine)) violations.push(`${where}: engine "${item.engine}" is not in the engine registry.`);
  if (item.adr && !KNOWN_ADRS.has(item.adr)) {
    violations.push(`${where}: linked ${item.adr} does not resolve to a decision record.`);
  }
}


if (violations.length > 0) {
  console.error("Technical debt register validation failed:\n");
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

const open = items.filter((i) => !i.resolved);
const resolved = items.filter((i) => i.resolved);

let md = generatedHeader("Technical Debt Dashboard", "`scripts/report-debt.mjs`");
md += `\nSource of truth: \`docs/debt/debt-register.json\`. ${open.length} open · ${resolved.length} resolved.\n`;

md += `\n## Summary\n\n| Severity | Open | Blocking |\n| --- | --- | --- |\n`;
for (const severity of SEVERITY) {
  const bucket = open.filter((i) => i.severity === severity);
  md += `| ${severity} | ${bucket.length} | ${bucket.filter((i) => i.blocking).length} |\n`;
}

for (const severity of SEVERITY) {
  const bucket = open.filter((i) => i.severity === severity);
  if (bucket.length === 0) continue;
  md += `\n## ${severity}\n\n| Id | Item | Owner | Milestone | Effort | Blocking | ADR | Engine | Certification |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;
  for (const item of bucket) {
    md += `| ${item.id} | ${item.title} | ${item.owner} | ${item.milestone} | ${item.effort} | ${item.blocking ? "**yes**" : "no"} | ${item.adr ?? "Unknown"} | ${item.engine} | ${item.certification ?? "Unknown"} |\n`;
  }
  md += `\n`;
  for (const item of bucket) md += `- **${item.id}** impact: ${item.impact}\n`;
}

md += `\n## Resolved\n\n| Id | Item | Resolved in |\n| --- | --- | --- |\n`;
for (const item of resolved) md += `| ${item.id} | ${item.title} | ${item.milestone} |\n`;

writeFileEnsured("docs/dashboards/Technical-Debt.md", md);
console.log(`Technical debt dashboard written: ${open.length} open, ${resolved.length} resolved.`);
