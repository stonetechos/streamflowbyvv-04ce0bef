# Certification Evidence Schema v1.0

**Status:** Normative. Produced by M0 Remediation (WP5).
**Implemented by:** `tests/certification/helpers/evidence.ts`, guarded by `scripts/check-certification.mjs`.

A certification row is only PASS if a machine-readable evidence record exists for it. Prose is not
evidence. A missing record is `unmeasured`, never `pass`.

## 1. Record shape

Every record is a JSON object written to
`tests/certification/evidence/<runId>/records/<evidenceId>.json`, and appended to
`tests/certification/evidence/<runId>/index.json`.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `evidenceId` | string | yes | Stable id of the certification row, e.g. `CERT-PERF-01`. |
| `profileId` | string | yes | Certification profile the row was executed under (`PROF-01` … `PROF-09`). |
| `status` | `pass` \| `fail` \| `unmeasured` \| `blocked` | yes | `blocked` = the profile itself is unsupported in this environment. |
| `browser` | string | yes | Engine that produced the row, or `node` for headless checks. |
| `platform` | string | yes | Host platform. |
| `detail` | string | no | One-line human explanation, required for `fail`/`unmeasured`/`blocked`. |
| `metric` | object | no | Present for every measured row (see §2). |
| `runId` | string | yes | Deterministic run identifier. |
| `commit` | string | yes | Commit the run was produced from. |
| `environmentProfile` | string | yes | `local-dev`, `preview`, `production`. |
| `region` | string | yes | Measurement region, `unknown` when not pinned. |
| `measuredAt` | ISO-8601 | yes | Time of measurement. |

## 2. Metric shape

| Field | Meaning |
| --- | --- |
| `name` | Metric label, e.g. `invite_to_join_ms`. |
| `unit` | Unit of every sample. |
| `sampleCount` | Number of samples; a single-sample metric may never satisfy a p95 threshold. |
| `p50`, `p95`, `p99` | Percentiles, `null` when `sampleCount` is too small to support them. |
| `min`, `max` | Extremes. |
| `failures` | Samples that did not complete. |

## 3. Status rules

1. A threshold may only be asserted against a percentile the sample count can support.
2. A profile marked `unsupported` in `certification-profiles.ts` forces `blocked` on every row that
   depends on it. `blocked` never rolls up as PASS.
3. `unmeasured` is the default. A row transitions to `pass` only by executing.
4. Re-running with the same `CERT_RUN_ID` overwrites that run's records; a new run id produces a
   new evidence directory, so historical runs are never silently mutated.

## 4. Environment overrides

| Variable | Purpose |
| --- | --- |
| `CERT_RUN_ID` | Pin the run id (CI uses the build id). |
| `CERT_ENVIRONMENT` | Environment profile recorded on every row. |
| `CERT_REGION` | Region recorded on every row. |
| `CERT_CHROMIUM_PATH` | Explicit browser binary. A browser that cannot launch is not evidence; images with an unusable bundled Chromium must set this rather than record failures. |
| `CERT_BASE_URL` | Target under test. |
