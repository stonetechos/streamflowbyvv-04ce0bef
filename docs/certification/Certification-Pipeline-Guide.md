# Certification Pipeline Guide

One command produces the full certification record:

```bash
npm run certify
```

## Stage order

```text
format
  -> lint
  -> architecture guard
  -> ADR validation
  -> certification guard
  -> Playwright certification matrix
  -> evidence collection
  -> performance baselines
  -> coverage report
  -> engine health
  -> technical debt dashboard
  -> milestone coverage
  -> release recommendation
```

The order is fixed. Each stage records its exit code, start and finish time into
`tests/certification/evidence/<RUN-ID>/reports/pipeline.json` and a human-readable `pipeline.md`.

## Failure behaviour

A failing stage halts the remainder, but the pipeline still writes a partial summary before exiting
non-zero. Later stages are recorded as `skipped` with the reason `Earlier stage failed.` A broken run
is still evidence.

## Options

| Flag / variable                   | Effect                                                              |
| --------------------------------- | ------------------------------------------------------------------- |
| `--no-browser`                    | Skip the Playwright stage; downstream reports use existing evidence |
| `CERT_RUN_ID`                     | Pin the run id (CI uses the build id)                               |
| `CERT_ENVIRONMENT`, `CERT_REGION` | Attribution recorded on every row                                   |
| `CERT_CHROMIUM_PATH`              | Explicit browser binary                                             |
| `CERT_FORCE_RUN=1`                | Permit rewriting a sealed run                                       |

## Determinism

Given the same commit, environment and evidence, every generated document is byte-identical. The
`docs-validate` workflow relies on this: it regenerates the dashboards and fails if the working tree
changes.
