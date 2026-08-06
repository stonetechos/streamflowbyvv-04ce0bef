/**
 * Evidence manifest, source-revision binding and destination durability — M1.17 (RET-1).
 *
 * RET-1 (docs/m1/M1.16-Fresh-Certification-Execution-Plan.md) is the finding that
 * certification evidence was written to a path excluded by `.gitignore`, so no run
 * survived the process that produced it. This module adds the three things a run
 * needs in order to be retained and later located during release review:
 *
 *   1. an exact source revision bound to the run,
 *   2. a manifest that lists every retained artifact with its size and digest,
 *   3. a check that the destination is genuinely not ignored by the repository.
 *
 * It introduces no certification state, row, threshold or semantic. Statuses stay
 * exactly as defined in scripts/lib/result-state.mjs.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { EVIDENCE_ROOT, loadRequiredEvidence, readJson } from "./evidence-io.mjs";

export const MANIFEST_FILE = "manifest.json";

/** Directories whose contents are retained in the repository (see .gitignore). */
export const RETAINED_SUBDIRS = ["records", "metrics", "reports", "screenshots", "logs"];

function git(args, fallback = null) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

/**
 * The exact revision under test. A branch name, tag or "latest" is never accepted.
 * `CERT_COMMIT_SHA` may pin the value in environments without a git directory
 * (CI checkouts provide it); it must still be a full 40-character object name.
 */
export function resolveSourceRevision() {
  const pinned = process.env["CERT_COMMIT_SHA"];
  const sha = pinned ?? git(["rev-parse", "HEAD"]);
  const valid = typeof sha === "string" && /^[0-9a-f]{40}$/.test(sha);
  const dirtyOutput = pinned ? null : git(["status", "--porcelain"], null);
  return {
    sha: valid ? sha : null,
    shortSha: valid ? sha.slice(0, 7) : null,
    source: pinned ? "CERT_COMMIT_SHA" : "git rev-parse HEAD",
    // Dirty-tree policy is not defined by any frozen authority; the flag is
    // recorded for the reviewer and does not by itself refuse a seal.
    workingTreeDirty: dirtyOutput === null ? null : dirtyOutput.length > 0,
    valid,
  };
}

/**
 * Whether the run directory is actually retained by the repository, i.e. not
 * matched by an active ignore rule. This is what RET-1 failed on.
 */
export function destinationStatus(runId) {
  const probe = join(EVIDENCE_ROOT, runId, "records");
  let ignoredBy = null;
  try {
    const out = execFileSync("git", ["check-ignore", "-v", probe], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (out) ignoredBy = out.split("\t")[0];
  } catch {
    // exit 1 = not ignored; exit 128 = no git dir.
    ignoredBy = null;
  }
  const insideRepo = git(["rev-parse", "--is-inside-work-tree"]) === "true";
  return {
    model: "repository-retained",
    path: join(EVIDENCE_ROOT, runId),
    reviewPath: `${EVIDENCE_ROOT}/${runId}`,
    versionControlled: insideRepo,
    ignored: ignoredBy !== null,
    ignoredBy,
    durable: insideRepo && ignoredBy === null,
  };
}

function walk(dir, base) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else out.push(full);
  }
  return out;
}

function digest(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** Every retained artifact in the run, with size and sha-256 digest. */
export function collectArtifacts(runId) {
  const runDir = join(EVIDENCE_ROOT, runId);
  const files = [];
  for (const sub of RETAINED_SUBDIRS) {
    for (const path of walk(join(runDir, sub), runDir)) {
      files.push({
        path: relative(runDir, path).split("\\").join("/"),
        bytes: statSync(path).size,
        sha256: digest(path),
      });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

const OWNER_BY_ROW = (() => {
  const map = new Map();
  for (const entry of loadRequiredEvidence()) map.set(entry.id, entry.owner ?? null);
  return map;
})();

/** Owning engine for a row id, from docs/registry/required-evidence.json. */
export function engineForRow(evidenceId) {
  if (OWNER_BY_ROW.has(evidenceId)) return OWNER_BY_ROW.get(evidenceId);
  for (const [id, owner] of OWNER_BY_ROW) {
    if (evidenceId.startsWith(id)) return owner;
  }
  return null;
}

/**
 * Work-package identifier for the run. No frozen authority defines a per-row
 * work package, so it is supplied by the executor (`CERT_WORK_PACKAGE`) or by
 * the records themselves. Absent, the run cannot be sealed — RET-1 requires
 * every retained run to map to its owning work package.
 */
export function resolveWorkPackage(records) {
  const fromEnv = process.env["CERT_WORK_PACKAGE"];
  if (fromEnv) return fromEnv.trim();
  const fromRecords = [...new Set(records.map((r) => r?.workPackage).filter(Boolean))];
  if (fromRecords.length === 1) return fromRecords[0];
  return null;
}

export function buildManifest({ runId, records, counts, runState }) {
  const revision = resolveSourceRevision();
  const destination = destinationStatus(runId);
  const rows = [...new Set(records.map((r) => r?.evidenceId).filter(Boolean))].sort();
  return {
    manifestVersion: "1.0.0",
    runId,
    workPackage: resolveWorkPackage(records),
    milestone: process.env["CERT_MILESTONE"] ?? null,
    sourceRevision: {
      sha: revision.sha,
      shortSha: revision.shortSha,
      source: revision.source,
      workingTreeDirty: revision.workingTreeDirty,
    },
    executedAt: records[0]?.measuredAt ?? null,
    manifestWrittenAt: new Date().toISOString(),
    environmentProfile: records[0]?.environmentProfile ?? null,
    region: records[0]?.region ?? null,
    runState,
    counts,
    rows: rows.map((id) => {
      const record = records.find((r) => r.evidenceId === id);
      return {
        evidenceId: id,
        engine: engineForRow(id),
        profileId: record?.profileId ?? null,
        status: record?.status ?? null,
        record: `records/${id}.json`,
      };
    }),
    engines: [...new Set(rows.map(engineForRow).filter(Boolean))].sort(),
    retention: {
      model: destination.model,
      destination: destination.reviewPath,
      versionControlled: destination.versionControlled,
      ignored: destination.ignored,
      ignoredBy: destination.ignoredBy,
      note: "Repository-retained and revision-traceable. Not cryptographically immutable: digests detect tampering, they do not prevent it.",
    },
    artifacts: collectArtifacts(runId),
  };
}

/**
 * Reasons a manifest may not be sealed. Fail-closed: a missing revision, row
 * mapping, work package or durable destination refuses the seal.
 */
export function manifestViolations(manifest) {
  const problems = [];
  if (!manifest) return ["manifest is absent; a run without a manifest can never be sealed"];
  if (!manifest.runId) problems.push("manifest is missing `runId`");
  if (!manifest.sourceRevision?.sha) {
    problems.push(
      "manifest is missing an exact source revision (`sourceRevision.sha`); a branch name or `latest` is not accepted",
    );
  }
  if (!manifest.workPackage) {
    problems.push(
      "manifest is missing `workPackage`; set CERT_WORK_PACKAGE for the run (RET-1 row-to-work-package mapping)",
    );
  }
  if (!Array.isArray(manifest.rows) || manifest.rows.length === 0) {
    problems.push("manifest maps no certification row");
  } else {
    for (const row of manifest.rows) {
      if (!row.engine) problems.push(`${row.evidenceId}: no owning engine in the evidence registry`);
    }
  }
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
    problems.push("manifest references no retained artifact");
  }
  if (!manifest.retention?.destination) problems.push("manifest declares no durable destination");
  if (manifest.retention?.ignored) {
    problems.push(
      `evidence destination is excluded from the repository by \`${manifest.retention.ignoredBy}\`; evidence would not survive the run`,
    );
  }
  if (manifest.retention && manifest.retention.versionControlled === false) {
    problems.push("evidence destination is not inside a repository working tree");
  }
  return problems;
}

/** Every manifest artifact must exist on disk with a matching digest. */
export function artifactViolations(runId, manifest) {
  const runDir = join(EVIDENCE_ROOT, runId);
  const problems = [];
  for (const artifact of manifest?.artifacts ?? []) {
    const path = join(runDir, artifact.path);
    if (!existsSync(path)) {
      problems.push(`manifest references a missing artifact: ${artifact.path}`);
      continue;
    }
    if (digest(path) !== artifact.sha256) {
      problems.push(`artifact digest mismatch: ${artifact.path}`);
    }
  }
  return problems;
}

export function readManifest(runId) {
  return readJson(join(EVIDENCE_ROOT, runId, MANIFEST_FILE), null);
}
