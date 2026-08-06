#!/usr/bin/env node
/**
 * ADR validation guard — M0.5 WP6.
 *
 * Fails when the decision record set contradicts itself or the Constitution.
 * Portable: plain Node, no dependencies.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ADR_DIR = "docs/adr";
const EXTRA_ADR_FILES = ["docs/blueprint/ADR-015-engine-decomposition.md"];
const VALID_STATUS = ["Draft", "Proposed", "Accepted", "Superseded", "Deprecated"];
const DOC_ROOTS = ["docs"];

const violations = [];
const files = [];

for (const entry of readdirSync(ADR_DIR)) {
  if (entry.startsWith("ADR-") && entry.endsWith(".md")) files.push(join(ADR_DIR, entry));
}
for (const extra of EXTRA_ADR_FILES) {
  if (existsSync(extra)) files.push(extra);
  else violations.push(`Declared ADR file is missing: ${extra}`);
}

/** id -> { file, status, supersedes } */
const adrs = new Map();

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const id = (file.match(/ADR-(\d{3})/) ?? [])[0];
  if (!id) {
    violations.push(`${file}: filename does not contain an ADR id.`);
    continue;
  }
  const statusMatch = source.match(/(?:\*\*Status:\*\*|^Status:)\s*([A-Za-z]+)/m);
  if (!statusMatch) {
    violations.push(`${file}: no Status declaration found.`);
  } else if (!VALID_STATUS.includes(statusMatch[1])) {
    violations.push(
      `${file}: status "${statusMatch[1]}" is not one of ${VALID_STATUS.join(" / ")} (I-governance §ADR lifecycle).`,
    );
  }
  const status = statusMatch?.[1] ?? "Unknown";
  const supersededBy =
    source.match(/(?:\*\*Superseded by:\*\*|^Superseded by:)\s*(ADR-\d{3})/m)?.[1] ?? null;
  if (status === "Superseded" && !supersededBy) {
    violations.push(`${file}: status is Superseded but no "Superseded by: ADR-nnn" is declared.`);
  }
  adrs.set(id, { file, status, supersededBy });
}

// Numbering continuity.
const numbers = [...adrs.keys()].map((id) => Number(id.slice(4))).sort((a, b) => a - b);
for (let i = 1; i < numbers.length; i += 1) {
  if (numbers[i] !== numbers[i - 1] + 1) {
    violations.push(
      `ADR numbering gap between ADR-${String(numbers[i - 1]).padStart(3, "0")} and ADR-${String(numbers[i]).padStart(3, "0")}.`,
    );
  }
}

// Cross-reference resolution across all documentation.
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

const deprecated = new Set(
  [...adrs.entries()].filter(([, meta]) => meta.status === "Deprecated").map(([id]) => id),
);

for (const root of DOC_ROOTS) {
  for (const doc of walk(root)) {
    const source = readFileSync(doc, "utf8");
    for (const match of source.matchAll(/ADR-(\d{3})/g)) {
      const id = match[0];
      if (!adrs.has(id)) violations.push(`${doc}: references ${id}, which does not exist.`);
      else if (deprecated.has(id) && /binding|authoritative/i.test(source)) {
        violations.push(`${doc}: cites deprecated ${id} as binding.`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("ADR validation failed:\n");
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

console.log(
  `ADR validation passed: ${adrs.size} decision records, references resolve, no contradictions.`,
);
