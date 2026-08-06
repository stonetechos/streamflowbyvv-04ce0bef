# CI/CD Guide

Seven independent GitHub Actions workflows. Each fails on its own so a red build names the exact
failed subsystem — there is no single monolithic job to decode.

| Workflow                             | Job                            | Fails when                                                             |
| ------------------------------------ | ------------------------------ | ---------------------------------------------------------------------- |
| `.github/workflows/format.yml`       | Prettier format check          | Any file is unformatted                                                |
| `.github/workflows/lint.yml`         | ESLint                         | Any error, or more than 25 warnings                                    |
| `.github/workflows/typecheck.yml`    | TypeScript                     | `tsc --noEmit` reports an error                                        |
| `.github/workflows/architecture.yml` | Layer isolation + ADR          | Vendor leakage above Infrastructure, or an ADR contradiction           |
| `.github/workflows/certification-guard.yml` | Evidence schema + tiering | A required evidence field is missing, name-based tiering reappears, or the debt register is malformed |
| `.github/workflows/playwright.yml`   | Certification matrix           | Any certification row fails                                            |
| `.github/workflows/docs-validate.yml`| Generated documentation        | Dashboards are stale relative to the evidence on disk                  |

## Evidence in CI

The Playwright workflow pins `CERT_RUN_ID=RUN-CI-<run_id>-<attempt>`, `CERT_ENVIRONMENT=ci` and
`CERT_REGION=github-hosted`, so every artifact is attributable to a build. The full run directory is
uploaded as a build artifact with 90-day retention. Evidence collection runs with `if: always()`, so a
failing matrix still produces evidence.

## Local equivalence

`npm run verify` runs the same checks as the format, lint, typecheck, architecture and certification
guard workflows. `npm run certify` additionally runs the Playwright matrix and regenerates every
dashboard, which is what `docs-validate` asserts is committed.

## Browser availability

If the runner's bundled Chromium cannot launch, set `CERT_CHROMIUM_PATH` to a working binary. A
browser that cannot launch is not evidence — the harness must never record a failure caused by the
image.
