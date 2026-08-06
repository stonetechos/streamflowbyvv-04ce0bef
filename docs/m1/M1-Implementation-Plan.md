# M1 — Private Watch Room: Implementation Plan

Status: Planning only. No M1 implementation is authorized by this document.
Sprint: M1.0. Mode: Planning. Constitution: v2.0.0 (frozen).

---

## 1. Pre-flight audit (repository state, not report claims)

Verified directly against the repository rather than trusting `docs/m0.6/M0.6-Certification-Gate-Remediation-Report.md`.

| Claim under test                                          | Method                                | Result                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Blueprint present and frozen                              | `ls docs/blueprint`                   | Confirmed — 17 documents plus `ADR-015-engine-decomposition.md`                                                            |
| Mandatory evidence registry exists                        | read `docs/registry/required-evidence.json` | Confirmed — version 1.0.0, 24 required entries                                                                       |
| M0.6 gate libraries exist                                 | `ls scripts/lib`                      | Confirmed — `result-state.mjs`, `evidence-io.mjs`; `scripts/check-gates.mjs` present                                       |
| `gates:check` wired into the green gate                   | read `package.json`                   | Confirmed — `verify` = format:check, lint, typecheck, arch:check, cert:check, gates:check, adr:check                        |
| Sealed evidence `RUN-M0R-001` exists                      | `ls tests/certification/evidence`     | Confirmed — 25 records, `index.json`, `artifacts/`                                                                          |
| Zero Tier A / Tier B claims                               | read `docs/blueprint/B-capability-matrix.md`, `src/domain/providers/provider-tier.ts` | Confirmed — all launch OTT rows are Tier C                                                          |
| Voice rows blocked, not failed                            | read `records/CERT-VOICE-01.json`     | Confirmed — `status: "blocked"`, reason names PROF-08                                                                       |

**Discrepancies recorded (not fixed in this sprint):**

- **D-01.** `docs/registry/required-evidence.json` contains **no entry for any M1 row** (`CERT-ROOM-*`, `CERT-PRES-*`, `CERT-WP-*`, `CERT-SYNC-C-*`, `CERT-PROV-01/02`, `CERT-EXP-*`). The mandatory set is the M0 set only. Registry extension is an M1 work item, not an M0.6 defect.
- **D-02.** `docs/blueprint/K-launch-certification.md` still carries `TBD (M0)` in the evidence-owner and evidence-location columns for every M1 row.
- **D-03.** `DEBT-005` is described in `docs/debt/debt-register.json` as the PROF-08 / LiveKit blocker at milestone **M3**, while `docs/blueprint/J-technical-debt.md` line 15 uses the same identifier for an unrelated ADR-header item at milestone M0. The identifier is overloaded across two documents.
- **D-04.** `docs/blueprint/D-milestone-roadmap.md` lists `CERT-VOICE-01..02` inside the M1 row set, but those rows depend on PROF-08, which the profile registry marks `unsupported` and the debt register schedules for M3.
- **D-05.** `playwright.config.ts` declares only `web-chromium`, `web-firefox`, `web-webkit`. There is **no `web-mobile` project**, which `CERT-SYNC-C-02` requires.

---

## 2. M1 launch envelope

Taken verbatim in intent from `docs/blueprint/D-milestone-roadmap.md` §M1.

- **Participants:** 2–8, private rooms only.
- **Platform:** web desktop first. Web mobile is in the certification row set (`CERT-SYNC-C-02`) but has no harness project today.
- **Tier:** Tier C only. Zero Tier A and zero Tier B capabilities may be claimed.
- **Gate:** Beta.
- **Profiles in scope:** PROF-01 Nominal, PROF-02 High latency, PROF-04 Transient outage, PROF-07 Multi-participant, and the Late-Join / Leave-Rejoin journeys the roadmap names.
- **Out of envelope:** Tier A control paths, native Android/iOS, catch-up convergence (`CERT-WP-03`, M2), packet-loss profiles (PROF-03), voice-under-load (PROF-08).

---

## 3. Work packages

Each package is scoped to one owning engine. Status is one of **Planned**, **Blocked**, **Needs discovery**.

| ID   | Package                              | Engine      | Scope                                                                                                | Non-goals                                          | Exit criteria                                                     | Status          |
| ---- | ------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- | --------------- |
| WP1  | Certification harness extension      | Engineering | Playwright specs and evidence writers for the 14 M1 rows                                              | New rows, new profiles, changed semantics           | Every M1 row emits a schema-valid record with a real status        | Needs discovery |
| WP2  | Registry and checklist wiring        | Engineering | Add M1 rows to `required-evidence.json`; resolve `TBD (M0)` cells in K                                | Changing the mandatory-evidence algorithm           | `gates:check` refuses an M1 seal that omits an M1 row              | Planned         |
| WP3  | Invite resolution hardening          | Room        | `CERT-ROOM-01` across sign-in, install, cold start                                                     | New invite surfaces                                | Row passes under PROF-01 and PROF-05                               | Planned         |
| WP4  | Join, capacity, leave/rejoin         | Room        | `CERT-ROOM-02/03/04`; 9th-joiner refusal message; grace-window rejoin                                  | Host-transfer authority (M2)                        | Three rows pass under PROF-01 and PROF-07                          | Planned         |
| WP5  | Presence accuracy                    | Presence    | `CERT-PRES-01/02`; absence within 10 s under PROF-04                                                   | Presence analytics                                  | Both rows pass; disconnect threshold measured, not asserted        | Planned         |
| WP6  | Watch-party stage and countdown      | Watch Party | `CERT-WP-01/02`; instrumented countdown spread against the C4 budget                                   | Catch-up flow (`CERT-WP-03`, M2)                    | Both rows pass with measured spread recorded                       | Planned         |
| WP7  | Tier C coordination correctness      | Sync        | `CERT-SYNC-C-01`; deep link opens, countdown coordinates, no false-sync UI                             | Any Tier A control path                            | Row passes; UI asserts manual-sync honesty                         | Planned         |
| WP8  | Web-mobile certification surface     | Sync        | `CERT-SYNC-C-02` — requires a mobile Playwright project that does not exist                            | Native shells                                      | Row executes on a mobile viewport project                          | Needs discovery |
| WP9  | Provider disclosure and fallback     | Provider    | `CERT-PROV-01/02`; disclosure on every surface, one-step reversible fallback                           | Changing provider classification or tier evidence   | Both rows pass across all B-matrix launch rows                     | Planned         |
| WP10 | Experience: a11y and reduced motion  | Experience  | `CERT-EXP-01/02`; extend the axe sweep to all launch surfaces; assert reduced motion                   | Visual redesign                                    | Zero AA violations recorded; motion respects OS preference         | Planned         |

**Voice (roadmap-listed, excluded from M1 delivery):** `CERT-VOICE-01/02` remain **Blocked by dependency** on PROF-08 / DEBT-005. They are not an M1 work package. See `M1-Risk-Register.md` R-04.

---

## 4. Definition of done for M1

1. All ten packages complete or explicitly deferred by ADR.
2. All 14 M1 rows execute and emit schema-valid evidence with a status from the authoritative vocabulary.
3. `npm run verify` green; `npm run certify` seals a run containing every mandatory M1 record.
4. Zero Tier A or Tier B claims anywhere in evidence or UI.
5. Human gate review recorded, as required by `docs/blueprint/I-governance.md`.

---

M1 implementation was not performed. M1 remains pending explicit human authorization.
