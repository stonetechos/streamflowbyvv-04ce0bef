/**
 * Authoritative evidence destination — M1.18 (DEST-1).
 *
 * DEST-1 (docs/m1/M1.16-Fresh-Certification-Execution-Plan.md) is the finding that
 * the destination for future certification evidence was not proven as ONE unique,
 * discoverable, validated path. M1.17 established WHAT is retained (RET-1); this
 * module establishes WHERE, in exactly one place, and makes the answer testable.
 *
 * It introduces no certification row, state, profile, threshold or lifecycle step.
 * The destination value is unchanged from the M1.17 retention contract:
 *
 *   tests/certification/evidence/<RUN-ID>/
 *
 * Responsibilities:
 *   1. own the single authoritative root constant,
 *   2. reject unsafe / ambiguous RUN-IDs before any path is constructed,
 *   3. resolve every required artifact path beneath that one root,
 *   4. detect a competing evidence root declared anywhere in the repository.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The one authoritative evidence root. No other root may exist. */
export const EVIDENCE_ROOT = "tests/certification/evidence";

/**
 * A RUN-ID is one path segment. Anything else (traversal, separators, absolute
 * paths, dot-names) is refused before a destination is constructed.
 */
export const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function runIdViolation(runId) {
  if (typeof runId !== "string" || runId.length === 0) return "RUN-ID is absent";
  if (runId === "." || runId === "..") return `RUN-ID \`${runId}\` is a directory reference`;
  if (runId.includes("/") || runId.includes("\\"))
    return `RUN-ID \`${runId}\` contains a path separator; the destination is a single directory beneath ${EVIDENCE_ROOT}/`;
  if (runId.includes("..")) return `RUN-ID \`${runId}\` contains a traversal sequence`;
  if (!RUN_ID_PATTERN.test(runId))
    return `RUN-ID \`${runId}\` is not a safe path segment (allowed: A-Z a-z 0-9 . _ -, max 128 chars)`;
  return null;
}

export function assertSafeRunId(runId) {
  const problem = runIdViolation(runId);
  if (problem) throw new Error(`Unsafe evidence destination: ${problem}`);
  return runId;
}

/** `tests/certification/evidence/<RUN-ID>` — the per-run destination. */
export function resolveRunDir(runId) {
  return join(EVIDENCE_ROOT, assertSafeRunId(runId));
}

/** Repository review path (always forward-slashed, as quoted in reports). */
export function reviewPath(runId) {
  return `${EVIDENCE_ROOT}/${assertSafeRunId(runId)}`;
}

/**
 * Every discoverability path a reviewer needs, all beneath the one root.
 * Raw runner output (`videos/`, `artifacts/`, `html/`, `report.json`) is a
 * generated temporary workspace beneath the same root, never an authority.
 */
export function runPaths(runId) {
  const dir = resolveRunDir(runId);
  return {
    root: EVIDENCE_ROOT,
    runDir: dir,
    reviewPath: reviewPath(runId),
    manifest: join(dir, "manifest.json"),
    index: join(dir, "index.json"),
    summary: join(dir, "summary.json"),
    completionMarker: join(dir, "completed.json"),
    records: join(dir, "records"),
    metrics: join(dir, "metrics"),
    reports: join(dir, "reports"),
    screenshots: join(dir, "screenshots"),
    logs: join(dir, "logs"),
    workspace: { videos: join(dir, "videos"), artifacts: join(dir, "artifacts") },
  };
}

/**
 * Files permitted to declare the evidence root. Every declaration must resolve
 * to EVIDENCE_ROOT; anything else is a competing destination.
 */
export const ROOT_DECLARATION_SITES = [
  "scripts/lib/evidence-destination.mjs",
  "scripts/lib/evidence-io.mjs",
  "scripts/check-gates.mjs",
  "tests/certification/helpers/run-context.ts",
  "playwright.config.ts",
  ".github/workflows/playwright.yml",
];

const ROOT_LIKE = /(?:[A-Za-z0-9_./-]*?)certification\/evidence/g;

/**
 * Every literal evidence-root path declared in tracked source, config and CI.
 * Returns `{ file, value, authoritative }` per occurrence.
 */
export function collectRootDeclarations(files = null) {
  const targets = files ?? trackedSearchFiles();
  const found = [];
  for (const file of targets) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(ROOT_LIKE)) {
      const value = match[0].replace(/^[^A-Za-z0-9]+/, "");
      found.push({ file, value, authoritative: value === EVIDENCE_ROOT });
    }
  }
  return found;
}

function trackedSearchFiles() {
  try {
    return execFileSync(
      "git",
      ["ls-files", "scripts", "tests/certification", "playwright.config.ts", ".github/workflows"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )
      .toString()
      .split("\n")
      .filter((line) => line.trim().length > 0);
  } catch {
    return ROOT_DECLARATION_SITES;
  }
}

/** Declarations that name a root other than the authoritative one. */
export function competingRoots(files = null) {
  return collectRootDeclarations(files).filter((entry) => !entry.authoritative);
}
