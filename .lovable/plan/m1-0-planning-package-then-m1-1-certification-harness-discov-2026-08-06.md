# M1.0 Planning Package, then M1.1 Certification Harness Discovery

Two sequential documentation-only sprints. No product code, UI, migrations, schema, provider behaviour, CI workflows, or certification semantics are touched in either. M1 remains unauthorized throughout.

## Pre-flight audit (first step of M1.0)

Verify actual repository state rather than trusting the M0.6 report:

- Confirm `docs/blueprint/` (17 docs), `docs/registry/required-evidence.json`, `docs/m0.6/M0.6-Certification-Gate-Remediation-Report.md` exist and are consistent.
- Confirm the M0.6 gate fixes are real: `scripts/lib/result-state.mjs`, `scripts/lib/evidence-io.mjs`, `scripts/check-gates.mjs`, and the `gates:check` script wired into `verify`.
- Confirm sealed evidence `RUN-M0R-001` validates and that zero Tier A / Tier B claims exist.
- Record every discrepancy between report claims and repository reality in the plan documents. Do not fix them.

## Stage 1 — M1.0 planning package (5 documents)

Created under `docs/m1/`:

| File | Contents |
| --- | --- |
| `M1-Implementation-Plan.md` | M1 launch envelope (2–8 private participants, web desktop first, Tier C only), work packages WP1–WP10 with scope, non-goals, exit criteria |
| `M1-Backlog.md` | Per-package tasks, owning engine, acceptance criteria, certification rows each package must satisfy |
| `M1-Dependency-Graph.md` | Package dependencies, critical path, parallelizable tracks (text/ASCII diagram) |
| `M1-Certification-Checklist.md` | The 14 in-scope M1 rows plus the 4 voice/debt items, mapped to packages and required profiles |
| `M1-Risk-Register.md` | Risks with likelihood, impact, mitigation, owning engine, and linkage to `docs/blueprint/J-technical-debt.md` |

Every package is marked planned, blocked, or needing discovery. No implementation.

## Stage 2 — M1.1 certification harness discovery spike (1 document)

Creates exactly one file: `docs/m1/M1.1-Certification-Harness-Discovery.md`. No other file is created or modified.

Rows investigated (existing only, never renamed, merged, split, or added):
CERT-ROOM-01..04, CERT-PRES-01/02, CERT-WP-01/02, CERT-SYNC-C-01/02, CERT-PROV-01/02, CERT-EXP-01/02.
Voice dependency state documented read-only: CERT-VOICE-01, CERT-VOICE-02, PROF-08, DEBT-005 — described, not fixed.

For each row, the 17 discovery questions are answered against real repository paths in `tests/certification/{room,realtime,provider,voice,resilience,accessibility,profiles,fixtures,helpers,evidence}`, `src/`, `docs/registry/required-evidence.json`, and `.github/workflows/`.

Document sections:

1. Scope, non-goals, and authoritative inputs actually read (with any path discrepancies recorded).
2. Pre-flight verification result carried forward from M1.0.
3. **Traceability matrix** — one row per certification ID with all 21 required columns. Any path that does not exist is written as "None found", never guessed.
4. **Minimal change analysis** — for each row not "Runnable now", the smallest next step classified as test-only, certification-only, registry-only, production-code, schema, provider, or architecture change, with a Constitution/Launch-Envelope permissibility verdict.
5. Voice dependency state (CERT-VOICE-01/02, PROF-08, DEBT-005) and its relationship to M1.
6. Blocking severity ranking and recommended execution order for making rows runnable.
7. Unresolved unknowns, explicitly listed rather than guessed.

Status vocabulary is restricted to: Runnable now, Harness missing, Implementation missing, Registry mapping missing, Profile unavailable, Environment unavailable, Evidence writer missing, Blocked by policy, Blocked by dependency, Not applicable, Unknown. No row is marked Pass unless it executed; none marked Certified unless valid evidence already exists; no "Blocked" without a named blocking dependency.

## Constraints honoured

- Documentation only — `src/`, migrations, UI, provider classification, CI workflows, and certification semantics are untouched.
- No new certification rows, profiles, or registry evidence entries.
- Constitution v2.0.0 and Launch Envelope remain frozen; any needed change is recorded as a proposed ADR, not applied.
- Closing statement in both stages: M1 implementation was not performed; M1 remains pending explicit human authorization.
