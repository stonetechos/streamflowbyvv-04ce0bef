/**
 * Shared evidence + registry I/O — M0.5 WP2/WP3.
 *
 * Plain Node ESM, zero dependencies. Every generator reads through this module
 * so "Unknown remains Unknown" is enforced in exactly one place.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const EVIDENCE_ROOT = "tests/certification/evidence";
export const RUN_SUBDIRS = [
  "records",
  "metrics",
  "reports",
  "screenshots",
  "videos",
  "logs",
  "artifacts",
];

/** Statuses that may never roll up as a pass. */
export const NON_PASS = new Set(["fail", "unmeasured", "blocked"]);

export function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeFileEnsured(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

export function ensureRunLayout(runId) {
  for (const sub of RUN_SUBDIRS) {
    mkdirSync(join(EVIDENCE_ROOT, runId, sub), { recursive: true });
  }
  return join(EVIDENCE_ROOT, runId);
}

/** All run ids on disk, oldest-first by directory mtime then name. */
export function listRunIds() {
  if (!existsSync(EVIDENCE_ROOT)) return [];
  return readdirSync(EVIDENCE_ROOT)
    .filter((entry) => statSync(join(EVIDENCE_ROOT, entry)).isDirectory())
    .sort();
}

export function loadRun(runId) {
  const dir = join(EVIDENCE_ROOT, runId);
  const index = readJson(join(dir, "index.json"), null);
  const records = Array.isArray(index)
    ? index
    : existsSync(join(dir, "records"))
      ? readdirSync(join(dir, "records"))
          .filter((f) => f.endsWith(".json"))
          .map((f) => readJson(join(dir, "records", f)))
          .filter(Boolean)
      : [];
  return { runId, dir, records };
}

export function loadAllRuns() {
  return listRunIds()
    .map(loadRun)
    .filter((run) => run.records.length > 0);
}

export function latestRun() {
  const runs = loadAllRuns();
  return runs.length > 0 ? runs[runs.length - 1] : null;
}

/** De-duplicate by evidenceId, keeping the newest measurement in the run. */
export function recordsById(run) {
  const map = new Map();
  for (const record of run?.records ?? []) {
    const existing = map.get(record.evidenceId);
    if (!existing || (record.measuredAt ?? "") >= (existing.measuredAt ?? "")) {
      map.set(record.evidenceId, record);
    }
  }
  return map;
}

export function tally(records) {
  const counts = { pass: 0, fail: 0, unmeasured: 0, blocked: 0, total: 0 };
  for (const record of records) {
    counts.total += 1;
    if (counts[record.status] !== undefined) counts[record.status] += 1;
  }
  return counts;
}

/** Green / Amber / Red from a tally. Any fail is Red; any blocked is Amber. */
export function light(counts) {
  if (counts.total === 0) return "Red";
  if (counts.fail > 0) return "Red";
  if (counts.blocked > 0 || counts.unmeasured > 0) return "Amber";
  return "Green";
}

export function unknown(value) {
  return value === null || value === undefined ? "Unknown" : String(value);
}

export function loadRegistry(name) {
  const data = readJson(`docs/registry/${name}.json`, null);
  if (!data) throw new Error(`Missing registry: docs/registry/${name}.json`);
  return data;
}

export function loadDebt() {
  const data = readJson("docs/debt/debt-register.json", null);
  if (!data) throw new Error("Missing debt register: docs/debt/debt-register.json");
  return data.items;
}

export function generatedHeader(title, source) {
  return `<!-- GENERATED FILE — do not edit by hand. Produced by ${source}. -->\n\n# ${title}\n`;
}

/* ---------------------------------------------------------------------------
 * M0.6 — mandatory evidence, schema validation and sealing status (GATE-01/02)
 * ------------------------------------------------------------------------- */

import { RESULT_STATES } from "./result-state.mjs";

export const COMPLETION_MARKER = "completed.json";

/** The one authoritative mandatory evidence set. */
export function loadRequiredEvidence() {
  const data = readJson("docs/registry/required-evidence.json", null);
  if (!data || !Array.isArray(data.required)) {
    throw new Error("Missing or malformed registry: docs/registry/required-evidence.json");
  }
  return data.required;
}

/** Mandatory-evidence identifiers that have no record in the run. */
export function missingRequiredEvidence(records) {
  const ids = records.map((r) => r?.evidenceId).filter(Boolean);
  const missing = [];
  for (const entry of loadRequiredEvidence()) {
    const matches =
      entry.match === "prefix"
        ? ids.filter((id) => id.startsWith(entry.id))
        : ids.filter((id) => id === entry.id);
    if (matches.length < (entry.minimum ?? 1)) missing.push(entry.id);
  }
  return missing;
}

const MANDATORY_FIELDS = ["evidenceId", "status", "runId", "commit", "environmentProfile"];

/** Schema problems, always evaluated — sealing never exempts a run (GATE-02). */
export function schemaViolations(records) {
  const problems = [];
  for (const record of records) {
    const id = record?.evidenceId ?? "<no id>";
    for (const field of MANDATORY_FIELDS) {
      if (!record?.[field]) problems.push(`${id}: missing mandatory field \`${field}\``);
    }
    if (record?.status && !RESULT_STATES.includes(record.status)) {
      problems.push(`${id}: illegal result state \`${record.status}\``);
    }
  }
  return problems;
}

/** Terminal run state derived from the records present. */
export function deriveRunState(counts) {
  if (counts.total === 0) return "UNMEASURED";
  if (counts.fail > 0) return "FAILED";
  if (counts.blocked > 0) return "BLOCKED";
  if (counts.unmeasured > 0) return "UNMEASURED";
  return "PASSED";
}

/** A run is successful only when sealed, marked complete and PASSED. */
export function isSuccessfulRun(runId) {
  const summary = readJson(join(EVIDENCE_ROOT, runId, "summary.json"), null);
  const marker = readJson(join(EVIDENCE_ROOT, runId, COMPLETION_MARKER), null);
  return Boolean(summary?.sealed && marker?.complete === true);
}

/** Latest run that sealed successfully; dashboards must read through this. */
export function latestSealedRun() {
  const runs = loadAllRuns().filter((run) => isSuccessfulRun(run.runId));
  return runs.length > 0 ? runs[runs.length - 1] : null;
}
