/**
 * Deterministic run context — M0 Remediation WP2.
 *
 * Every certification artifact is addressed by (runId, commit, profile).
 * The run ID is derived, not random, so a rerun of the same commit in the
 * same environment produces a stable, comparable identity.
 */
import { execSync } from "node:child_process";

function safeExec(command: string, fallback: string): string {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return fallback;
  }
}

export const COMMIT = process.env["CERT_COMMIT"] ?? safeExec("git rev-parse --short HEAD", "unknown");

export const RUN_STARTED_AT = process.env["CERT_RUN_STARTED_AT"] ?? new Date().toISOString();

/** e.g. `RUN-20260806T0630-ab12cd3` — stable per commit + minute of start. */
export const RUN_ID =
  process.env["CERT_RUN_ID"] ??
  `RUN-${RUN_STARTED_AT.replace(/[-:]/g, "").slice(0, 13)}-${COMMIT}`;

export const EVIDENCE_ROOT = "tests/certification/evidence";

export const ENVIRONMENT_PROFILE = process.env["CERT_ENVIRONMENT"] ?? "local-dev";

export const REGION = process.env["CERT_REGION"] ?? "unknown";
