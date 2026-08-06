# M1 — Backlog

Status: Planning only. Sprint M1.0. No implementation authorized.

Each task names its owning engine, acceptance criteria, and the certification rows the package must satisfy. No task may be started before explicit human authorization of M1.

---

## WP1 — Certification harness extension (Engineering) — Needs discovery

| Task     | Description                                                                                                       | Acceptance criteria                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| WP1-T1   | Inventory which M1 rows have any existing spec emitting their evidence ID                                          | Traceability matrix produced (delivered by M1.1)                                            |
| WP1-T2   | Define the spec file layout for room, presence, watch-party, sync-C, provider, experience rows                     | One spec path per row, no row without a home                                                |
| WP1-T3   | Multi-client identity fixture for 2–8 concurrent participants                                                      | Fixture provisions and tears down N identities deterministically                            |
| WP1-T4   | Instrumentation hooks for countdown spread and disconnect detection latency                                        | Values are measured and recorded, never asserted as pass without measurement                |
| WP1-T5   | Evidence writers for each new row using the existing `tests/certification/helpers/evidence.ts` contract            | Records validate against the M0.6 schema; no new evidence semantics introduced              |

Rows: all 14.

## WP2 — Registry and checklist wiring (Engineering) — Planned

| Task   | Description                                                                          | Acceptance criteria                                                     |
| ------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| WP2-T1 | Add the 14 M1 rows to `docs/registry/required-evidence.json` with correct owners      | `gates:check` refuses to seal an M1 run missing any of them              |
| WP2-T2 | Replace `TBD (M0)` evidence-owner/location cells for M1 rows in `K-launch-certification.md` | No `TBD` remains for an M1 row                                     |
| WP2-T3 | Resolve the overloaded `DEBT-005` identifier between `J-technical-debt.md` and `debt-register.json` | One identifier, one meaning, recorded via ADR if the register is frozen |

Rows: all 14 (mapping only, no execution).

## WP3 — Invite resolution hardening (Room) — Planned

| Task   | Description                                                              | Acceptance criteria                                              |
| ------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| WP3-T1 | Invite link → room across a cold start                                    | `CERT-ROOM-01` passes under PROF-05                              |
| WP3-T2 | Invite link → room across an interposed sign-in                           | Pending destination survives the auth round trip                 |
| WP3-T3 | Invite link re-open for an existing member                                | Member is returned to the room, not refused                      |

Rows: CERT-ROOM-01. Modules: `src/domain/rooms/room-flow-service.ts`, `src/routes/join.$code.tsx`.

## WP4 — Join, capacity, leave/rejoin (Room) — Planned

| Task   | Description                                                        | Acceptance criteria                                                 |
| ------ | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| WP4-T1 | Member appears to all peers with correct identity and role          | `CERT-ROOM-02` passes under PROF-07                                 |
| WP4-T2 | 9th joiner refused with a clear, localized message                  | `CERT-ROOM-03` passes; refusal is user-legible, not an error code    |
| WP4-T3 | Rejoin within grace restores room context                           | `CERT-ROOM-04` passes under PROF-04                                  |

Rows: CERT-ROOM-02, CERT-ROOM-03, CERT-ROOM-04. Modules: `src/domain/rooms/room-flow-service.ts`, `room-read-model.ts`.

## WP5 — Presence accuracy (Presence) — Planned

| Task   | Description                                                       | Acceptance criteria                                        |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| WP5-T1 | Readiness state identical for all participants                     | `CERT-PRES-01` passes under PROF-07                        |
| WP5-T2 | Dropped member marked absent within the 10 s threshold             | `CERT-PRES-02` records a measured latency under PROF-04    |

Rows: CERT-PRES-01, CERT-PRES-02. Modules: `src/domain/rooms/presence-coordinator.ts`, `src/features/waiting-room/use-room-presence.ts`.

## WP6 — Watch-party stage and countdown (Watch Party) — Planned

| Task   | Description                                                  | Acceptance criteria                                       |
| ------ | -------------------------------------------------------------- | ----------------------------------------------------------- |
| WP6-T1 | Countdown reaches zero within the C4 spread budget           | `CERT-WP-01` records measured spread across all clients   |
| WP6-T2 | Stages advance identically for host and members              | `CERT-WP-02` passes under PROF-07                         |

Rows: CERT-WP-01, CERT-WP-02. Modules: `src/domain/countdown/countdown-runtime.ts`, `src/domain/rooms/countdown-coordinator.ts`.

## WP7 — Tier C coordination correctness (Sync) — Planned

| Task   | Description                                                        | Acceptance criteria                                                     |
| ------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| WP7-T1 | Deep link opens the provider without any false-sync affordance      | `CERT-SYNC-C-01` passes; UI never implies host control of OTT playback  |
| WP7-T2 | Countdown coordinates the manual launch                             | Coordination is deterministic across clients                            |

Rows: CERT-SYNC-C-01. Modules: `src/domain/providers/deep-link-service.ts`, `provider-launch-coordinator.ts`, `manual-sync-guidance.ts`.

## WP8 — Web-mobile certification surface (Sync) — Needs discovery

| Task   | Description                                                                 | Acceptance criteria                             |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| WP8-T1 | Determine whether a mobile-viewport Playwright project is permitted under the frozen harness | Decision recorded; ADR raised if it is not |
| WP8-T2 | Execute the Tier C journey on that surface                                   | `CERT-SYNC-C-02` emits a real status            |

Rows: CERT-SYNC-C-02. Blocker: no `web-mobile` project exists in `playwright.config.ts`.

## WP9 — Provider disclosure and fallback (Provider) — Planned

| Task   | Description                                                                   | Acceptance criteria                                               |
| ------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| WP9-T1 | Capability tier and consequence stated before commit on every surface          | `CERT-PROV-01` covers 100% of B-matrix launch rows                |
| WP9-T2 | One-step, announced, reversible degraded-mode fallback under fault injection   | `CERT-PROV-02` passes                                             |

Rows: CERT-PROV-01, CERT-PROV-02. Modules: `src/domain/providers/provider-tier.ts`, `capability-certification.ts`, `src/features/providers/`. Classification itself is not modified.

## WP10 — Experience: accessibility and reduced motion (Experience) — Planned

| Task    | Description                                                          | Acceptance criteria                                     |
| ------- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| WP10-T1 | Extend the axe sweep from its current route list to all launch surfaces | `CERT-EXP-01` records zero AA violations                |
| WP10-T2 | Assert reduced-motion compliance everywhere motion is used            | `CERT-EXP-02` passes at 100%                            |

Rows: CERT-EXP-01, CERT-EXP-02. Modules: `src/foundation/accessibility/accessibility-provider.tsx`, `src/styles.css`, existing `tests/certification/accessibility/a11y-sweep.spec.ts`.

---

## Excluded from the backlog

| Item                     | Reason                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------ |
| CERT-VOICE-01, CERT-VOICE-02 | Blocked by dependency: PROF-08 unsupported, no media-server credentials (DEBT-005, milestone M3) |
| CERT-WP-03               | Catch-up flow is M2 per the roadmap                                                 |
| CERT-SYNC-C-03/04/05     | Native and live surfaces, non-blocking / post-launch                                |
| Anything PROF-03         | Packet-loss profile unsupported (DEBT-006, milestone M4)                            |

---

M1 implementation was not performed. M1 remains pending explicit human authorization.
