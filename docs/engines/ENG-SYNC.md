<!-- GENERATED FILE — do not edit by hand. Produced by `scripts/report-engines.mjs`. -->

# Sync Engine — Engine Health

**Id** `ENG-SYNC` · **Owner** Sync & Clock · **Status** Certified · **Evidence run** `RUN-M0R-001`

## Module coverage

| Path | Present |
| --- | --- |
| `src/domain/sync` | yes |
| `src/domain/countdown` | yes |

## Certification

| Row | Profile | Status | Detail |
| --- | --- | --- | --- |
| `CERT-PERF-03` | PROF-01 | pass | Delivery-time spread of one start signal across two independent subscribers on one host. Single-host measurement understates real-world spread. |
| `CERT-PERF-04` | PROF-01 | pass | Absolute offset between local clock and server Date header, HTTP-midpoint estimated. Second-granularity header caps resolution at ~1000ms. |

## Technical debt

| Id | Severity | Milestone | Blocking | Item |
| --- | --- | --- | --- | --- |
| DEBT-003 | High | M1 | no | No Measured Baseline for most C4 metrics |
| DEBT-006 | High | M4 | no | PROF-03 packet-loss profile unsupported |

## Known risks

- Clock offset resolution is capped at ~1000ms by HTTP Date granularity.
