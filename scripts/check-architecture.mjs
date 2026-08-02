#!/usr/bin/env node
/**
 * Architecture guard — Sprint 1.3 §3/§6.
 *
 * Fails the check when a layer above Infrastructure references a vendor:
 * a driver package, the generated schema types, or the integration folder.
 * Portable: plain Node, no dependencies, runnable from any editor or CI.
 *
 * Usage: node scripts/check-architecture.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

/** Import specifiers no layer above Infrastructure may reference. */
const FORBIDDEN = [
  { pattern: /@supabase\/[a-z-]+/g, label: "driver package" },
  { pattern: /@\/integrations\/supabase/g, label: "generated schema types" },
  { pattern: /@\/infrastructure\/supabase/g, label: "vendor adapter module" },
];

/** Paths allowed to reference a vendor. Everything else must stay portable. */
const ALLOWED_PREFIXES = ["src/infrastructure/", "src/integrations/"];

/** Files the hosting platform generates and owns. */
const PLATFORM_OWNED = ["src/start.ts", "src/routeTree.gen.ts"];

const EXTENSIONS = new Set([".ts", ".tsx"]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files);
      continue;
    }
    const dot = entry.lastIndexOf(".");
    if (dot !== -1 && EXTENSIONS.has(entry.slice(dot))) files.push(full);
  }
  return files;
}

const violations = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).split("\\").join("/");
  if (ALLOWED_PREFIXES.some((prefix) => rel.startsWith(prefix))) continue;
  if (PLATFORM_OWNED.includes(rel)) continue;

  const source = readFileSync(file, "utf8");
  for (const { pattern, label } of FORBIDDEN) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const line = source.slice(0, match.index).split("\n").length;
      violations.push(`${rel}:${line} references ${label} (${match[0]})`);
    }
  }
}

if (violations.length > 0) {
  console.error("Architecture guard failed — vendor leakage outside Infrastructure:\n");
  for (const violation of violations) console.error(`  - ${violation}`);
  console.error(
    "\nMove the dependency into src/infrastructure and expose a vendor-neutral contract from src/repository.",
  );
  process.exit(1);
}

console.log("Architecture guard passed: no vendor leakage outside Infrastructure.");
