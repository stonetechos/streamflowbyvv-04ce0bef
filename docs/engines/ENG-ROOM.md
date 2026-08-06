<!-- GENERATED FILE — do not edit by hand. Produced by `scripts/report-engines.mjs`. -->

# Room Engine — Engine Health

**Id** `ENG-ROOM` · **Owner** Room & Lifecycle · **Status** Measured · **Evidence run** `RUN-M0R-001`

## Module coverage

| Path                       | Present |
| -------------------------- | ------- |
| `src/domain/rooms`         | yes     |
| `src/repository/rooms`     | yes     |
| `src/infrastructure/rooms` | yes     |

## Certification

| Row             | Profile | Status     | Detail                                                                                   |
| --------------- | ------- | ---------- | ---------------------------------------------------------------------------------------- |
| `CERT-AUTHZ-01` | PROF-01 | pass       | Non-member read of room_state returned zero rows under RLS.                              |
| `CERT-AUTHZ-02` | PROF-01 | pass       | Non-member update affected zero rows.                                                    |
| `CERT-AUTHZ-03` | PROF-01 | pass       | Host-role escalation by an outsider affected zero rows.                                  |
| `CERT-AUTHZ-04` | PROF-01 | pass       | Self-inserted co_host membership rejected by RLS.                                        |
| `CERT-AUTHZ-05` | PROF-01 | unmeasured | Room has no room_state row; monotonic version guard not exercised.                       |
| `CERT-AUTHZ-06` | PROF-01 | pass       | Cross-room ownership rewrite affected zero rows.                                         |
| `CERT-AUTHZ-07` | PROF-01 | pass       | Unauthenticated room enumeration returned zero rows.                                     |
| `CERT-SA-01`    | PROF-01 | pass       | Scanned 497 source files; no LiveKit data-channel publish path exists.                   |
| `CERT-SA-02`    | PROF-01 | pass       | Monotonic room_state.version trigger is present in committed migrations.                 |
| `CERT-SA-03`    | PROF-01 | pass       | Membership, host and controller authority are server-side predicates.                    |
| `CERT-SA-04`    | PROF-01 | pass       | Tier resolution reads the certification registry only; no name list, no client override. |
| `CERT-SA-05`    | PROF-01 | pass       | Playback session revisions are not readable without authorization.                       |

## Technical debt

| Id       | Severity | Milestone | Blocking | Item                                                   |
| -------- | -------- | --------- | -------- | ------------------------------------------------------ |
| DEBT-013 | Medium   | M1        | no       | Room capacity enforcement is asserted server-side only |

## Known risks

- Room capacity and lifecycle transitions are asserted by server authority rows only; UI-level lifecycle remains unmeasured.
