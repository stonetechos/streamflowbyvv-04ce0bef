# Developer Infrastructure Report

Produced by the M0.5 Developer Infrastructure Sprint. Describes the permanent engineering
infrastructure that makes every future milestone automatically produce certification evidence.

## Engineering commands

| Command                 | Does                                                                            |
| ----------------------- | -------------------------------------------------------------------------------- |
| `npm run verify`        | format · lint · typecheck · architecture guard · certification guard · ADR guard |
| `npm run certify`       | the full certification pipeline (see the Certification Pipeline Guide)           |
| `npm run evidence`      | collect, validate, index and seal the evidence for a run                         |
| `npm run release-check` | regenerate every dashboard and print the release recommendation                  |
| `npm run architecture`  | layer isolation + ADR validation                                                 |
| `npm run milestone`     | milestone gate coverage against the newest evidence run                          |

All outputs are deterministic: same commit + same evidence produces byte-identical documents.

## Components

| Component                        | File                                    |
| -------------------------------- | ----------------------------------------- |
| Shared evidence/registry I/O     | `scripts/lib/evidence-io.mjs`           |
| Certification pipeline runner    | `scripts/certify.mjs`                   |
| Evidence collector               | `scripts/evidence.mjs`                  |
| ADR validation guard             | `scripts/check-adrs.mjs`                |
| Performance dashboard            | `scripts/report-performance.mjs`        |
| Coverage report                  | `scripts/report-coverage.mjs`           |
| Engine health reports            | `scripts/report-engines.mjs`            |
| Technical debt dashboard + guard | `scripts/report-debt.mjs`               |
| Release dashboard                | `scripts/report-release.mjs`            |
| Milestone coverage               | `scripts/milestone.mjs`                 |

Every script is plain Node ESM with zero runtime dependencies, so the project stays portable and the
tooling runs identically in CI, on a laptop, and outside Lovable.

## Registries (hand-maintained, machine-read)

| Registry                        | Owns                                                             |
| ------------------------------- | ------------------------------------------------------------------ |
| `docs/registry/engines.json`    | 13 engines + Experience Subsystem: owner, modules, rows, risks    |
| `docs/registry/metrics.json`    | Three-value performance budget per C4                             |
| `docs/registry/milestones.json` | Milestone gates (which evidence rows constitute Definition of Done) |
| `docs/debt/debt-register.json`  | Technical debt with owner, milestone, ADR, engine, certification    |

Generators never write to a registry. A registry entry that references an unknown engine, milestone or
ADR fails the build.

## Generated documentation

- `docs/dashboards/Release-Dashboard.md` — the single engineering dashboard
- `docs/dashboards/Performance-Dashboard.md`
- `docs/dashboards/Coverage-Report.md`
- `docs/dashboards/Technical-Debt.md`
- `docs/dashboards/Milestone-Coverage.md`
- `docs/engines/*.md` — one health report per engine plus an index

Each carries a `GENERATED FILE` banner. The `docs-validate` workflow fails if any is stale.

## Honesty invariants enforced in code

1. A row that did not execute is `unmeasured`, never pass.
2. `blocked` and `unmeasured` never roll up as a pass in any report.
3. A missing value prints **Unknown**; nothing is interpolated.
4. A Certified Threshold is only ever set by a human, after a Measured Baseline exists.
5. Tier claims resolve only through the evidence-gated certification registry.
