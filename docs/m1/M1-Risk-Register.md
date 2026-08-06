# M1 — Risk Register

Status: Planning only. Sprint M1.0. No implementation authorized.

Likelihood and impact are High / Medium / Low. Each risk names an owning engine and, where applicable, its linkage to `docs/blueprint/J-technical-debt.md` and `docs/debt/debt-register.json`.

---

| ID   | Risk                                                                                                            | Likelihood | Impact | Owning engine | Debt link               | Mitigation                                                                                                       |
| ---- | --------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| R-01 | No M1 row has an executable spec today; all 14 need harness work before any status other than `unmeasured`      | High       | High   | Engineering   | —                       | WP1 is the critical path and is entered through the M1.1 discovery spike, not guessed at                         |
| R-02 | M1 rows are absent from `required-evidence.json`, so an M1 run could seal while omitting every M1 record        | High       | High   | Engineering   | —                       | WP2 adds the rows before any M1 seal is trusted; `gates:check` then enforces it                                  |
| R-03 | `CERT-SYNC-C-02` requires a web-mobile surface, but `playwright.config.ts` has no mobile project                | High       | Medium | Sync          | —                       | WP8 discovery decides between adding a viewport project or deferring the row by ADR                              |
| R-04 | Voice rows sit in the M1 roadmap row set but are permanently blocked by PROF-08                                 | High       | Medium | Voice         | DEBT-005 (M3)           | Treat as `blocked`, never `fail`; do not let them gate the M1 seal; resolution stays at M3                       |
| R-05 | `DEBT-005` means two different things in two frozen documents                                                   | Medium     | Medium | Governance    | DEBT-005                | WP2-T3 reconciles the identifier; if the register is frozen, raise a numbered ADR                                |
| R-06 | K-launch-certification still carries `TBD (M0)` evidence owners for every M1 row                                | High       | Medium | Governance    | —                       | WP2-T2 fills the cells as part of registry wiring                                                                |
| R-07 | Countdown-spread and disconnect-latency budgets could be asserted rather than measured                          | Medium     | High   | Watch Party   | DEBT-004 (CERT-PERF-03) | M0.6 semantics already forbid unmeasured passes; WP1-T4 records values explicitly as measurements                |
| R-08 | Multi-participant fixtures for 2–8 identities may be slow or flaky, producing false `fail` instead of `blocked` | Medium     | High   | Engineering   | —                       | Reuse the M0.6 environment-vs-product classification in `scripts/lib/result-state.mjs`; never reclassify by hand |
| R-09 | Provider disclosure work touches provider surfaces and could drift into changing tier classification            | Medium     | High   | Provider      | —                       | WP9 is UI-assertion only; `provider-tier.ts` evidence tuples are out of scope and Constitution-frozen            |
| R-10 | Accessibility sweep currently covers a subset of routes; extending it may surface a large AA backlog            | Medium     | Medium | Experience    | —                       | Run the extended sweep early in M1 so the backlog is visible before the gate, not at it                          |
| R-11 | Packet-loss behaviour remains uncertified, so adverse-network claims cannot be made at Beta                     | High       | Low    | Sync          | DEBT-006 (M4)           | State the limitation in the M1 gate report; make no resilience claim beyond PROF-02 and PROF-04                  |
| R-12 | Scope creep from Beta feedback into Tier A or native work                                                       | Medium     | High   | Governance    | —                       | Launch envelope is frozen at 2–8 users, web desktop, Tier C; any change requires a numbered ADR                  |

---

## Standing constraints that bound every mitigation

- Constitution v2.0.0 and the Launch Envelope are frozen; changes only via numbered ADR in `docs/adr/`.
- `blocked` and `unmeasured` never count as pass.
- StreamFlow supports zero Tier A and zero Tier B capabilities; nothing in M1 may claim otherwise.
- ADR-014 is binding: no OTT playback control is possible or permitted.

---

M1 implementation was not performed. M1 remains pending explicit human authorization.
