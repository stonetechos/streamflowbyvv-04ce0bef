# M1.0 — Implementation Planning Package (documentation only)

This produces the five M1 planning documents. No product code, schema, CI, evidence, or constitution content is touched.

## Pre-flight audit (already executed, read-only)

| Check | Result |
| --- | --- |
| M0.6 report | Present at `docs/m0.6/M0.6-Certification-Gate-Remediation-Report.md` |
| `npm run verify` | PASS (0 errors, 21 lint warnings under the 25 cap) |
| `npm run cert:check` | PASS — tiering is evidence-based |
| `npm run gates:check` | Exists, PASS — 15/15 GATE-01/02/03 assertions |
| `npm run certify` | Not re-run (would mutate/append evidence) — recorded as Unmeasured |
| `npm run release-check` | Not re-run (regenerates dashboards) — recorded as Unmeasured |
| Sealed run `RUN-M0R-001` | 25 records: 22 pass, 2 blocked (CERT-VOICE-01/02, PROF-08 unsupported), 1 unmeasured (CERT-AUTHZ-05) |
| Tier A capabilities | 0 |
| Tier B capabilities | 0 |
| Tier C capabilities | All 18 providers, evidenced |
| M1 authorization | Still pending explicit human approval |

Principal gap found (not previously recorded): the M1 rows named in the Milestone Roadmap — `CERT-ROOM-01..04`, `CERT-PRES-01..02`, `CERT-WP-01..02`, `CERT-SYNC-C-01..02`, `CERT-PROV-01..02`, `CERT-EXP-01..02` — exist in `K-launch-certification.md` but have **no harness implementation** and are absent from `docs/registry/required-evidence.json`. Every M1 package therefore carries a certification-discovery gap rather than a ready gate. This will be stated plainly, not papered over.

## Documents to create

1. `docs/m1/M1-Implementation-Plan.md` — pre-flight audit, assumptions, objective, scope/non-scope, common M1 Definition of Done, full work-package specs (identity, objective, user value, scope, non-scope, existing modules, expected file changes, dependencies, critical path, acceptance criteria with Given/When/Then + evidence, certification requirements, risks, rollback, estimate), sequencing, recommendation, open questions.
2. `docs/m1/M1-Backlog.md` — one entry per backlog item with unique BL IDs, "As a … I want … so that …" stories, priority, status, acceptance criteria, dependencies, estimate, certification gate, owner, rollback, traceability.
3. `docs/m1/M1-Dependency-Graph.md` — Mermaid graph plus an equivalent plain-text dependency table, critical path, parallel lanes, cycle check, human-approval gate.
4. `docs/m1/M1-Certification-Checklist.md` — package-by-package gates using only existing row and profile IDs, with explicit "certification discovery required" entries where no runnable row exists; alpha/beta/launch gating columns; blocked never counted as pass.
5. `docs/m1/M1-Risk-Register.md` — methodology, unique risk IDs, the mandated risk areas, mitigation ownership, contingency, escalation triggers, release impact.

## Candidate work-package classification (to be written up)

| ID | Package | Planned status |
| --- | --- | --- |
| WP1 | Private room lifecycle polish | Partially complete — invite/join shipped, lifecycle transitions uncertified |
| WP2 | Lobby readiness improvements | Partially complete |
| WP3 | Presence reliability | Planned — rows exist, harness missing |
| WP4 | Countdown reliability | Planned |
| WP5 | Tier C watch experience polish | Planned — coordinated manual play preserved exactly |
| WP6 | Voice reliability | Blocked by dependency — PROF-08 unsupported, no LiveKit test project (DEBT-005) |
| WP7 | Text chat | Not in Launch Envelope for M1 — Chat is contract-only and gated to M3 |
| WP8 | Reconnect and recovery polish | Planned |
| WP9 | Accessibility and degraded-mode polish | Planned — automated a11y subset passes, manual WCAG audit outstanding |
| WP10 | Launch readiness review | Planned — release-gates everything |
| WP11 | M1 certification harness discovery spike (new, derived from evidence) | Needs discovery — must precede WP1–WP5 gating |

Ordering, dependency edges, and estimates will be justified per package from repository evidence only.

## Guardrails applied

- No capability is upgraded above Tier C; no OTT playback automation, capture, or overlay work is planned (ADR-014 binding).
- No new certification rows, profiles, evidence records, or scripts are created.
- Anything unverified is labelled Assumption / Needs discovery / Unverified / Blocked.
- Final answer will state that M1 implementation was not performed and remains pending human authorization.
