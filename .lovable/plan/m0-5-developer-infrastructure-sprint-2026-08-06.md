# M0.5 — Developer Infrastructure Sprint

Goal: make StreamFlow continuously verifiable. Every commit can produce certification evidence automatically. No product features, no UI, no schema, no architecture changes.

## Current state (verified)

- Scripts today: `lint`, `format:check`, `arch:check`, `cert:check`, `cert`, `cert:*`, `verify`. There is **no** `typecheck`, `certify`, `evidence`, `release-check`, `milestone` command.
- No `.github/` directory exists — there is no CI at all.
- Guards exist: `scripts/check-architecture.mjs`, `scripts/check-certification.mjs`.
- Playwright harness exists (`playwright.config.ts`) writing to `tests/certification/evidence/<runId>/` with `records/*.json` + `index.json`; one committed run `RUN-M0R-001`.
- Docs exist in `docs/blueprint/`, `docs/adr/` (ADR-001..016, no ADR-015 in `docs/adr` — it lives in `docs/blueprint/`), `docs/m0/`.

## WP1 — Continuous Integration

Seven independent workflow files under `.github/workflows/`, each failing on its own so the failed subsystem is named by the job:

`format.yml`, `lint.yml`, `typecheck.yml`, `architecture.yml`, `certification-guard.yml`, `playwright.yml`, `docs-validate.yml`.

Shared setup: Bun + Node, dependency cache, `CERT_RUN_ID` derived from the CI run id so evidence is attributable. Playwright workflow uploads `tests/certification/evidence/<runId>/` as an artifact. A `typecheck` script (`tsc --noEmit`-equivalent via `tsgo`) is added since none exists today.

## WP2 — Certification pipeline

`scripts/certify.mjs` — one command, deterministic stages in fixed order:

```text
verify -> architecture guard -> certification guard -> playwright
  -> certification matrix -> performance baselines
  -> evidence collection -> summary -> release recommendation
```

Each stage records start/end, exit code, and status. Stage failure short-circuits later stages but still writes a partial summary. Output is written under the run directory, not printed only.

## WP3 — Evidence repository

Standardise on `tests/certification/evidence/<RUN-ID>/` (existing convention, no relocation) with fixed subfolders:

```text
evidence/RUN-xxxx/
  records/      metrics/      reports/
  screenshots/  videos/       logs/      artifacts/
  index.json    summary.json
```

Immutability: `scripts/evidence.mjs` refuses to write into an existing completed run unless `CERT_FORCE_RUN=1`; historical runs are never pruned. Documented in `docs/certification/Evidence-Guide.md`.

## WP4 — Performance dashboard

`scripts/report-performance.mjs` reads evidence `index.json` files across all runs and emits `docs/dashboards/Performance-Dashboard.md` + `metrics/performance.json`: invite latency, ready propagation, countdown spread, reconnect, clock offset, voice, room lifecycle, plus a per-metric historical trend across runs. Rows with no measurement render `Unknown`; `blocked` and `unmeasured` never roll up as pass. No interpolation, no synthesised numbers.

## WP5 — Coverage reporting

`scripts/report-coverage.mjs` emits `docs/dashboards/Coverage-Report.md` covering architecture, certification, Playwright, engine, capability and milestone coverage. Every cell is one of: Implemented / Measured / Certified / Blocked / Unknown, derived only from files on disk and evidence records.

## WP6 — ADR validation

`scripts/check-adrs.mjs`, wired into `verify` and its own CI workflow. Validates: every ADR file has required front matter (id, status, date), status is one of Draft/Accepted/Superseded/Deprecated per `docs/blueprint/I-governance.md`, no gaps in ADR numbering, all `ADR-nnn` references across `docs/` resolve to an existing file, superseded ADRs name their successor, and no document cites a Deprecated ADR as binding. Contradictions fail the check.

## WP7 — Engine health

`scripts/report-engines.mjs` emits one report per engine under `docs/engines/` — Room, Timeline, Watch Party, Sync, Voice, Chat, Presence, Provider, Notification, Community, AI/Po, Analytics, Moderation — plus Experience Subsystem. Each: owner, module coverage (mapped from `docs/m0/M0-Module-Mapping.md`), tests, certification rows, known risks, technical debt, status. An `docs/engines/README.md` index rolls them up.

## WP8 — Technical debt dashboard

`docs/dashboards/Technical-Debt.md` generated from a committed machine-readable register `docs/debt/debt-register.json`, seeded from `docs/m0/M0-Technical-Debt-Prioritization.md` and `docs/blueprint/J-technical-debt.md`. Fields per item: id, severity (Critical/High/Medium/Low), owner, milestone, impact, estimated effort, blocking, linked ADR, linked engine, linked certification row. Guard fails on malformed or unlinked entries.

## WP9 — Release dashboard

`scripts/report-release.mjs` emits `docs/dashboards/Release-Dashboard.md`: architecture, certification, performance, capability, technical debt, open blockers, release recommendation — each with a Green/Amber/Red indicator and the evidence run it came from. Rules are explicit (e.g. any Critical debt or any Red subsystem forces a Red recommendation).

## WP10 — Engineering commands

Add to `package.json`, all deterministic:

| Command | Does |
| --- | --- |
| `npm run verify` | format, lint, typecheck, arch guard, cert guard, ADR guard |
| `npm run certify` | full WP2 pipeline |
| `npm run evidence` | collect/validate/index evidence for a run |
| `npm run release-check` | regenerate dashboards, print Green/Amber/Red recommendation |
| `npm run architecture` | architecture + ADR + module mapping validation |
| `npm run milestone` | milestone coverage vs the Constitution roadmap |

## Documentation deliverables

- `docs/development/Developer-Infrastructure-Report.md`
- `docs/dashboards/Engineering-Dashboard.md` (entry point linking all dashboards)
- `docs/certification/Evidence-Guide.md`
- `docs/certification/Certification-Pipeline-Guide.md`
- `docs/development/CI-CD-Guide.md`
- `docs/development/Release-Guide.md`
- `docs/m0/M0.5-Developer-Infrastructure-Report.md` including the Build Authorization Recommendation

## Technical notes

- All scripts are plain Node ESM with zero new runtime dependencies, matching the existing guard scripts, so they run in CI, locally, and outside Lovable.
- Nothing under `src/` changes. No migrations. No provider or tier changes.
- Reports are generated artifacts but committed, so a reviewer sees state without running anything.
- `blocked` and `unmeasured` never count as pass anywhere in the generators; missing data prints `Unknown`.
- Final Build Mode authorization stays a human gate; M0.5 only produces the recommendation.

## Constitutional limit (binding)

M0.5 is the **final infrastructure sprint**. After it completes:

- No further infrastructure, governance documents, certification frameworks, dashboards, engineering reports, ADR restructuring, architecture chapters, or developer tooling may be introduced — unless a blocker is discovered during implementation or certification, in which case the fix is scoped to unblocking only.
- StreamFlow enters **M1 Build Mode immediately** on successful M0.5 completion.
- All future work prioritises user-facing product capability over engineering infrastructure.
- The Constitution is **complete**; changes only via numbered ADR.

This clause is recorded in `docs/m0/M0.5-Developer-Infrastructure-Report.md`, `docs/blueprint/I-governance.md`, and project memory so it binds every later session.
