/**
 * Evidence writer — M0 Remediation WP2 / WP5.
 *
 * Certification is only real if it leaves an artifact. Every measurement and
 * every check writes a JSON record here. `unmeasured` is a first-class result:
 * Unknown remains Unknown, and an unmeasured row can never satisfy a
 * certification requirement.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { COMMIT, ENVIRONMENT_PROFILE, EVIDENCE_ROOT, REGION, RUN_ID } from "./run-context";

export type EvidenceStatus = "pass" | "fail" | "unmeasured" | "blocked";

export interface MetricSample {
  readonly metricId: string;
  readonly sampleCount: number;
  readonly p50: number | null;
  readonly p95: number | null;
  readonly p99: number | null;
  readonly failures: number;
  readonly unit: "ms";
}

export interface EvidenceRecord {
  readonly evidenceId: string;
  readonly runId: string;
  readonly commit: string;
  readonly environmentProfile: string;
  readonly region: string;
  readonly profileId: string;
  readonly browser: string;
  readonly platform: string;
  readonly status: EvidenceStatus;
  /** Present for measurement rows; absent for boolean conformance checks. */
  readonly metric?: MetricSample;
  readonly detail: string;
  readonly measuredAt: string;
}

export function runDir(): string {
  return join(EVIDENCE_ROOT, RUN_ID);
}

export function writeEvidence(
  record: Omit<EvidenceRecord, "runId" | "commit" | "environmentProfile" | "region" | "measuredAt">,
): EvidenceRecord {
  const full: EvidenceRecord = {
    ...record,
    runId: RUN_ID,
    commit: COMMIT,
    environmentProfile: ENVIRONMENT_PROFILE,
    region: REGION,
    measuredAt: new Date().toISOString(),
  };
  const path = join(runDir(), "records", `${record.evidenceId}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(full, null, 2)}\n`, "utf8");
  appendIndex(full);
  return full;
}

function appendIndex(record: EvidenceRecord): void {
  const path = join(runDir(), "index.json");
  const existing: EvidenceRecord[] = existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as EvidenceRecord[])
    : [];
  existing.push(record);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
}

export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[Math.max(0, index)]!);
}

export function summarize(
  metricId: string,
  values: readonly number[],
  failures: number,
): MetricSample {
  return {
    metricId,
    sampleCount: values.length,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    p99: values.length >= 20 ? percentile(values, 99) : null,
    failures,
    unit: "ms",
  };
}
