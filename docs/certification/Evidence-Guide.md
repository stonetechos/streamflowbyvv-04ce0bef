# Evidence Guide

Certification is only real if it leaves an artifact. This guide describes where evidence lives, what
it guarantees, and how it may and may not be modified.

## Layout

```text
tests/certification/evidence/<RUN-ID>/
  records/        one JSON record per certification row
  metrics/        derived metric aggregates (performance.json)
  reports/        pipeline.json, pipeline.md
  screenshots/    Playwright captures
  videos/         Playwright captures
  logs/           stdout/stderr captures
  artifacts/      traces and raw runner output
  index.json      every record in the run
  summary.json    counts + sealed flag
```

## Run identity

A run is addressed by `(runId, commit, environmentProfile, region)`. The run id is derived, not
random: `RUN-<yyyymmddThhmm>-<commit>` locally, `RUN-CI-<run_id>-<attempt>` in CI. Re-running the same
commit in the same minute reuses the id and overwrites that run's records; a new id creates a new
directory.

## Immutability

`npm run evidence` writes `summary.json` with `sealed: true`. A sealed run is never rewritten unless
`CERT_FORCE_RUN=1` is set explicitly. Historical runs are never pruned by any script in this
repository. Deleting evidence is a manual, deliberate act.

## Status vocabulary

| Status       | Meaning                                              |
| ------------ | ---------------------------------------------------- |
| `pass`       | The row executed and satisfied its threshold         |
| `fail`       | The row executed and did not satisfy its threshold   |
| `unmeasured` | The row did not execute — the default state          |
| `blocked`    | The row's profile is unsupported in this environment |

`blocked` and `unmeasured` never roll up as a pass, in any dashboard or report. Where a value is
absent, generated documents print **Unknown**. Nothing is interpolated or estimated.

## Validation

`node scripts/evidence.mjs` fails if any record is missing `evidenceId`, `status`, `runId`, `commit`
or `environmentProfile`. The full field schema is defined in
[Certification-Evidence-Schema.md](./Certification-Evidence-Schema.md).
