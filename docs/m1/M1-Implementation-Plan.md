# M1 — Private Watch Room: Implementation Plan

Status: Planning only. No M1 implementation is authorized by this document.
Sprint: M1.0. Mode: Build mode, documentation-only output. Constitution: v2.0.0 (frozen).

---

## 1. Pre-flight audit (repository state, not report claims)

Verified directly against the repository rather than trusting `docs/m0.6/M0.6-Certification-Gate-Remediation-Report.md`.

| Claim under test                          | Method                                                                                | Result                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Blueprint present and frozen              | `ls docs/blueprint`                                                                    | Confirmed — 17 documents plus `ADR-015-engine-decomposition.md`                    |
| Mandatory evidence registry exists        | read `docs/registry/required-evidence.json`                                            | Confirmed — version 1.0.0, 24 required entries                                     |
| M0.6 gate libraries exist                 | `ls scripts/lib`                                                                       | Confirmed — `result-state.mjs`, `evidence-io.mjs`; `scripts/check-gates.mjs` present |
| `gates:check` wired into the green gate   | read `package.json`                                                                    | Confirmed — `verify` = format:check, lint, typecheck, arch:check, cert:check, gates:check, adr:check |
| Sealed evidence `RUN-M0R-001` exists      | `ls tests/certification/evidence`                                                      | Confirmed — 25 records, `index.json`, `artifacts/`                                 |
| Zero Tier A / Tier B claims               | read `docs/blueprint/B-capability-matrix.md`, `src/domain/providers/provider-tier.ts`  | Confirmed — all launch OTT rows are Tier C                                          |
| Voice rows blocked, not failed            | read `records/CERT-VOICE-01.json`                                                      | Confirmed — `status: "blocked"`, reason names PROF-08                              |
| Certification spec tree                   | `ls tests/certification/*/`                                                            | Confirmed — 7 spec files across accessibility, provider, realtime, resilience, room, voice |
| Playwright projects                       | read `playwright.config.ts`                                                            | Confirmed — `web-chromium`, `web-firefox`, `web-webkit` only                        |
| Unit/integration test tree                | repository scan                                                                        | **None found** — `tests/` contains only `tests/certification/`                     |

**Discrepancies recorded (not fixed in this sprint):**

- **D-01.** `docs/registry/required-evidence.json` contains **no entry for any M1 row** (`CERT-ROOM-*`, `CERT-PRES-*`, `CERT-WP-*`, `CERT-SYNC-C-*`, `CERT-PROV-01/02`, `CERT-EXP-*`). The mandatory set is the M0 set only.
- **D-02.** `docs/blueprint/K-launch-certification.md` still carries `TBD (M0)` in the evidence-owner and evidence-location columns for every M1 row.
- **D-03.** `DEBT-005` is described in `docs/debt/debt-register.json` as the PROF-08 blocker at milestone **M3**, while `docs/blueprint/J-technical-debt.md` uses the same identifier for an unrelated item. The identifier is overloaded across two documents.
- **D-04.** `docs/blueprint/D-milestone-roadmap.md` lists `CERT-VOICE-01..02` inside the M1 row set, but those rows depend on PROF-08, which the profile definitions mark unsupported and the debt register schedules for M3.
- **D-05.** `playwright.config.ts` declares no `web-mobile` project, which `CERT-SYNC-C-02` requires.

---

## 2. Planning assumptions

Each assumption is labelled with how it would be invalidated. None of them is treated as proven.

1. The Launch Envelope in `docs/blueprint/D-milestone-roadmap.md` §M1 is authoritative and unchanged. *Invalidated by:* any amendment ADR.
2. The 14 rows listed in §5 are the complete M1 product row set, plus the two voice rows that are Blocked by dependency. *Invalidated by:* a differing reading of D or K.
3. Existing product modules named in `M1-Backlog.md` already implement the behavior under test, so most M1 work is test-only. *Status:* Unknown until execution; the harness may reveal product defects.
4. The M0.5 Constitutional Limit forbids new infrastructure but its ruling on harness-**configuration** changes (WP8) is Unknown.
5. `blocked` and `unmeasured` never count as pass; this is enforced by `scripts/lib/result-state.mjs`.

---

## 3. Objective

Produce an implementation-ready M1 work breakdown that can be executed without further planning, while proving nothing that the repository does not already prove.

---

## 4. Scope and non-scope

**In scope (frozen Launch Envelope):** 2–8 private participants · web desktop first · Tier C watch experience · existing lobby · existing room lifecycle · existing provider launcher · existing realtime · existing voice capability · existing authentication · existing profiles · existing friends · existing QR · existing countdown · existing notifications · existing branding.

**Out of scope, explicitly:** premium OTT automation · screen-capture synchronization · accessibility-service automation · any illegal playback control · TV platforms · public events · large-room conferencing · provider expansion · Tier A and Tier B claims · native Android/iOS · catch-up convergence (`CERT-WP-03`, roadmap M2) · packet-loss profiles (PROF-03) · voice-under-load (PROF-08).

---

## 5. Certification rows in scope

CERT-ROOM-01, CERT-ROOM-02, CERT-ROOM-03, CERT-ROOM-04, CERT-PRES-01, CERT-PRES-02, CERT-WP-01, CERT-WP-02, CERT-SYNC-C-01, CERT-SYNC-C-02, CERT-PROV-01, CERT-PROV-02, CERT-EXP-01, CERT-EXP-02.

Read-only dependency state: CERT-VOICE-01, CERT-VOICE-02 (**Blocked by dependency** — PROF-08 / `DEBT-005`).

---

## 6. Common M1 Definition of Done

Identical to the list in `M1-Backlog.md` §"Common M1 Definition of Done" and governed by the Constitution. Summarised: rows execute → schema-valid evidence with real statuses → rows registered as mandatory → `npm run verify` green → zero Tier A/B claims → nothing outside the envelope. A planning document can never satisfy any of these.

---

## 7. Work packages (summary; full specifications in `M1-Backlog.md`)

| ID   | Package                             | Engine      | Status                | Critical path |
| ---- | ----------------------------------- | ----------- | --------------------- | ------------- |
| WP1  | Certification harness extension     | Engineering | Needs discovery       | Yes           |
| WP2  | Registry and checklist wiring       | Engineering | Registry mapping missing | Yes        |
| WP3  | Invite resolution hardening         | Room        | Harness missing       | No            |
| WP4  | Join, capacity, leave/rejoin        | Room        | Harness missing       | No            |
| WP5  | Presence accuracy                   | Presence    | Harness missing       | No            |
| WP6  | Watch-party stage and countdown     | Watch Party | Harness missing       | No            |
| WP7  | Tier C coordination correctness     | Sync        | Harness missing       | No            |
| WP8  | Web-mobile certification surface    | Sync        | Environment unavailable | No          |
| WP9  | Provider disclosure and fallback    | Provider    | Harness missing       | No            |
| WP10 | Experience: a11y and reduced motion | Experience  | Partially complete    | No            |

---

## 8. Sequencing

1. **WP1** first and alone — it gates every product row.
2. **WP3, WP4, WP5** next, in parallel; they share the multi-identity fixture.
3. **WP6, WP7, WP9, WP10** in parallel once the fixture is stable.
4. **WP8** only after a governance ruling on the harness-configuration question.
5. **WP2** last — rows become mandatory only after they can emit records; making them mandatory earlier would break the green gate.

See `M1-Dependency-Graph.md`.

---

## 9. Implementation recommendation

Start with WP1-T3, the multi-identity fixture, because it is the prerequisite for the majority of in-scope rows. Do not begin any product change until a row has run and failed with recorded evidence; M1 is expected to be predominantly test-only, and any product edit must be justified by a failing record, not by inspection.

---

## 10. Unresolved questions

- **Q1.** Does the M0.5 Constitutional Limit permit adding a `web-mobile` Playwright project (WP8)? Status: Unknown — requires a governance ruling.
- **Q2.** Are countdown-zero timestamps observable from the harness today? Status: Needs discovery.
- **Q3.** Is disconnect-detection latency observable without product instrumentation? Status: Needs discovery.
- **Q4.** Does `a11y-sweep.spec.ts` already cover all launch surfaces? Status: Unknown.
- **Q5.** Which existing mechanism, if any, supports fault injection for `CERT-PROV-02`? Status: Needs discovery.
- **Q6.** Can `K-launch-certification.md` `TBD (M0)` cells be edited without an ADR, given the freeze? Status: Unknown.
- **Q7.** How is the overloaded `DEBT-005` identifier reconciled, and does that reconciliation itself require an ADR? Status: Needs discovery.

---

## 11. Implementation Contract

- **Planning is complete.** This package, together with `M1.1-Certification-Harness-Discovery.md`, is the final planning output for M1.
- **No further planning sprints are expected.** Additional planning is not an authorized activity.
- **Future work proceeds through implementation work packages only** — WP1 through WP10 as specified in `M1-Backlog.md`.
- **Any architectural change requires a numbered ADR** under `docs/adr/`, per `docs/blueprint/I-governance.md`.
- **Any infrastructure change must be justified by a blocker discovered during implementation**, recorded with the failing evidence that motivated it. Infrastructure may not be added speculatively.
- **M1 implementation was not performed in this sprint.** No source, schema, migration, UI, provider, CI, certification-semantic, registry, or evidence file was changed.
- **Human approval is still required before M1 implementation begins.**

---

M1 implementation was not performed. M1 remains pending explicit human authorization.
