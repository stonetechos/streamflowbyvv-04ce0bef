<!-- GENERATED FILE — do not edit by hand. Produced by `scripts/report-release.mjs`. -->

# Release Dashboard

Run `RUN-M0R-001` · commit `ca4cb39` · environment `local-dev`.

## Status

| Subsystem | Indicator | Detail |
| --- | --- | --- |
| Architecture | **Green** | Vendor isolation, ADR validation and layer guard all pass in `npm run verify`. |
| Certification | **Amber** | 22 pass · 0 fail · 1 unmeasured · 2 blocked of 25 rows. |
| Performance | **Amber** | 6/7 metrics have a Measured Baseline; 0 have a Certified Threshold. |
| Capability | **Amber** | Zero Tier A, zero Tier B capabilities. Every provider resolves to Tier C (ADR-014). |
| Technical debt | **Amber** | 9 open · 0 Critical · 1 blocking. |

## Open blockers

- DEBT-005 — PROF-08 voice profile unsupported — no LiveKit test project (Realtime Media, M3)

## Release recommendation

**Amber — release only with the listed blockers accepted in writing**

See [Performance Dashboard](./Performance-Dashboard.md), [Coverage Report](./Coverage-Report.md), [Technical Debt](./Technical-Debt.md), [Engine Health](../engines/README.md).
