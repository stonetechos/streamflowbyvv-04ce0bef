# M1 — Backlog (Work Package Specifications)

Sprint: M1.0. Mode: Planning only. Constitution v2.0.0 frozen.
No task in this document may be started before explicit human authorization of M1.

Every path in this document was verified against the repository. Where a path could not be verified it is written as **None found**. Where the repository cannot prove an answer it is written as **Unknown** or **Needs discovery**.

Status values used here are drawn only from the allowed vocabulary: Planned, Blocked, Needs discovery, Runnable now, Harness missing, Implementation missing, Registry mapping missing, Profile unavailable, Environment unavailable, Evidence writer missing, Blocked by dependency, Blocked by policy, Not applicable, Unknown, Partially complete, Already complete.

---

## Common M1 Definition of Done (applies to every work package)

A work package is done only when **all** of the following already hold in the repository — never by assertion in a planning document:

1. The named certification rows execute and emit schema-valid evidence records under `tests/certification/evidence/RUN-*/records/`.
2. Each record carries a status from the authoritative result vocabulary in `scripts/lib/result-state.mjs`; `blocked` and `unmeasured` never count as pass.
3. The rows are present in `docs/registry/required-evidence.json`, so `npm run gates:check` refuses to seal a run that omits them.
4. `npm run verify` is green (format:check, lint, typecheck, arch:check, cert:check, gates:check, adr:check).
5. No Tier A or Tier B claim appears in evidence, registry, `src/domain/providers/provider-tier.ts`, or UI copy.
6. No behavior outside the frozen Launch Envelope was added.

---

## WP1 — Certification harness extension

| Field | Value |
| --- | --- |
| **ID** | WP1 |
| **Title** | Certification harness extension for the 14 M1 rows |
| **Priority** | P0 — critical path |
| **Status** | Needs discovery |
| **User journey served** | All M1 journeys, indirectly (engineering enablement) |
| **Capability matrix reference** | `CAP-OTT-WEBDESK`, `CAP-OTT-WEBMOB` (`docs/blueprint/B-capability-matrix.md`); other M1 rows carry source `n/a` |
| **Launch envelope reference** | `docs/blueprint/D-milestone-roadmap.md` §M1 |
| **Owning engine(s)** | Engineering (no product engine) |
| **Objective** | Make every in-scope M1 row executable and evidence-producing without changing certification semantics |
| **User value** | None directly; it is the precondition for proving any M1 user value |
| **Scope** | Playwright specs, a multi-identity fixture, instrumentation hooks, evidence writers using the existing contract |
| **Non-scope** | New certification rows, new profiles, new evidence semantics, new dashboards, new CI workflows |
| **Existing implementation/modules reused** | `tests/certification/helpers/evidence.ts`, `tests/certification/helpers/run-context.ts`, `tests/certification/fixtures/backend.ts`, `tests/certification/profiles/certification-profiles.ts` |
| **Existing module/path references** | `playwright.config.ts` (projects: `web-chromium`, `web-firefox`, `web-webkit`), `scripts/certify.mjs`, `scripts/lib/evidence-io.mjs`, `scripts/lib/result-state.mjs` |
| **Expected files likely to change** | New spec files under `tests/certification/room/`, `tests/certification/realtime/`, `tests/certification/provider/`, `tests/certification/accessibility/`; new fixture under `tests/certification/fixtures/` |
| **Dependencies** | None upstream |
| **Critical path** | Yes — gates WP3–WP10 |
| **Acceptance criteria** | **Given** an authorized M1 implementation sprint, **When** the harness runs, **Then** each of the 14 rows emits one schema-valid record. *Evidence:* record files under `records/CERT-*.json` validating against the M0.6 schema. |
| **Certification requirements** | Rows: all 14. Profiles: PROF-01, PROF-02, PROF-04, PROF-05, PROF-07 (defined in `tests/certification/profiles/certification-profiles.ts`) |
| **Risks** | Multi-identity provisioning flakiness; instrumentation absent for countdown timestamps (see R-02, R-05) |
| **Rollback strategy** | Test-only change; delete the added spec/fixture files. No product surface affected. |
| **Estimate** | Unknown — depends on the multi-identity fixture spike (WP1-T3) |

Tasks: T1 inventory rows against existing specs (delivered by M1.1) · T2 define one spec home per row · T3 multi-identity fixture for 2–8 participants · T4 instrumentation hooks for countdown spread and disconnect latency · T5 evidence writers on the existing contract.

---

## WP2 — Registry and checklist wiring

| Field | Value |
| --- | --- |
| **ID** | WP2 |
| **Title** | Add the M1 rows to the mandatory-evidence registry |
| **Priority** | P0 — final convergence gate |
| **Status** | Registry mapping missing |
| **User journey served** | All M1 journeys (governance) |
| **Capability matrix reference** | As WP1 |
| **Launch envelope reference** | `docs/blueprint/D-milestone-roadmap.md` §M1 |
| **Owning engine(s)** | Engineering |
| **Objective** | Make an M1 seal impossible without every M1 record |
| **User value** | None directly; prevents false completion |
| **Scope** | Entries in `docs/registry/required-evidence.json`; replace `TBD (M0)` owner/location cells for M1 rows in `docs/blueprint/K-launch-certification.md`; reconcile the overloaded `DEBT-005` identifier |
| **Non-scope** | Changing the mandatory-evidence algorithm or evidence semantics |
| **Existing implementation/modules reused** | `scripts/check-gates.mjs`, `scripts/lib/evidence-io.mjs` |
| **Existing module/path references** | `docs/registry/required-evidence.json` (24 required entries, none for M1), `docs/blueprint/K-launch-certification.md`, `docs/debt/debt-register.json`, `docs/blueprint/J-technical-debt.md` |
| **Expected files likely to change** | `docs/registry/required-evidence.json`; K/J documents are frozen blueprint — any edit requires a numbered ADR |
| **Dependencies** | WP1 (records must exist before they are made mandatory) |
| **Critical path** | Yes |
| **Acceptance criteria** | **Given** an M1 run missing any M1 record, **When** `npm run gates:check` executes, **Then** sealing is refused and the missing row is named. *Evidence:* gate self-test output. |
| **Certification requirements** | All 14 rows, mapping only — no execution |
| **Risks** | Blueprint K is frozen; the `TBD (M0)` edit may be Blocked by policy without an ADR (R-06) |
| **Rollback strategy** | Revert the registry JSON entries |
| **Estimate** | Unknown |

---

## WP3 — Invite resolution hardening

| Field | Value |
| --- | --- |
| **ID** | WP3 |
| **Title** | Invite link resolves to the intended room across sign-in and cold start |
| **Priority** | P1 |
| **Status** | Harness missing |
| **User journey served** | Guest receives an invite link and reaches the room |
| **Capability matrix reference** | Source `n/a` in `docs/blueprint/K-launch-certification.md` |
| **Launch envelope reference** | Existing lobby, existing authentication, existing QR |
| **Owning engine(s)** | Room |
| **Objective** | Prove `CERT-ROOM-01` under real conditions |
| **User value** | A shared link always lands the guest in the right room |
| **Scope** | Cold start, interposed sign-in, re-open by an existing member |
| **Non-scope** | New invite surfaces, public rooms, host transfer |
| **Existing implementation/modules reused** | `src/domain/rooms/room-flow-service.ts`, `src/routes/join.$code.tsx` |
| **Existing module/path references** | Existing test: **None found** for `CERT-ROOM-01` |
| **Expected files likely to change** | New spec under `tests/certification/room/`; product changes only if the row fails |
| **Dependencies** | WP1 |
| **Critical path** | No |
| **Acceptance criteria** | **Given** a valid invite link and a signed-out guest, **When** the guest opens it and signs in, **Then** the guest lands in the intended room. *Evidence:* `records/CERT-ROOM-01.json` with a measured status under PROF-05. |
| **Certification requirements** | CERT-ROOM-01; profiles PROF-01, PROF-05 |
| **Risks** | Pending-destination persistence across the auth round trip |
| **Rollback strategy** | Revert spec; revert any product fix behind its own commit |
| **Estimate** | Unknown |

---

## WP4 — Join, capacity, leave/rejoin

| Field | Value |
| --- | --- |
| **ID** | WP4 |
| **Title** | Room membership lifecycle certification |
| **Priority** | P1 |
| **Status** | Harness missing |
| **User journey served** | Guest joins; ninth guest is refused; member rejoins after leaving |
| **Capability matrix reference** | Source `n/a` |
| **Launch envelope reference** | 2–8 private participants; existing room lifecycle |
| **Owning engine(s)** | Room |
| **Objective** | Prove `CERT-ROOM-02`, `CERT-ROOM-03`, `CERT-ROOM-04` |
| **User value** | Predictable membership, legible refusal, safe rejoin |
| **Scope** | Identity/role visibility to peers; capacity refusal message; grace-window rejoin |
| **Non-scope** | Host transfer authority (roadmap M2), public rooms |
| **Existing implementation/modules reused** | `src/domain/rooms/room-flow-service.ts`, `src/domain/rooms/room-read-model.ts` |
| **Existing module/path references** | Existing tests: `tests/certification/room/authorization.spec.ts`, `tests/certification/room/server-authority.spec.ts` (neither emits an M1 row ID) |
| **Expected files likely to change** | New spec under `tests/certification/room/` |
| **Dependencies** | WP1 (multi-identity fixture) |
| **Critical path** | No |
| **Acceptance criteria** | **Given** a room at capacity 8, **When** a ninth identity attempts to join, **Then** it is refused with a clear localized message. *Evidence:* `records/CERT-ROOM-03.json`. Plus per-row Given/When/Then for ROOM-02 (peer-visible identity and role) and ROOM-04 (rejoin within grace restores context). |
| **Certification requirements** | CERT-ROOM-02/03/04; profiles PROF-01, PROF-04, PROF-07 |
| **Risks** | Capacity constant location Unknown until implementation |
| **Rollback strategy** | Test-only revert |
| **Estimate** | Unknown |

---

## WP5 — Presence accuracy

| Field | Value |
| --- | --- |
| **ID** | WP5 |
| **Title** | Lobby readiness and disconnect detection |
| **Priority** | P1 |
| **Status** | Harness missing |
| **User journey served** | Participants see who is present and ready |
| **Capability matrix reference** | Source `n/a` |
| **Launch envelope reference** | Existing lobby, existing realtime |
| **Owning engine(s)** | Presence |
| **Objective** | Prove `CERT-PRES-01` and `CERT-PRES-02` (≤ 10 s threshold, measured) |
| **User value** | The lobby tells the truth about who is there |
| **Scope** | Readiness parity across clients; absence marking latency |
| **Non-scope** | Presence analytics, typing/activity indicators |
| **Existing implementation/modules reused** | `src/domain/rooms/presence-coordinator.ts`, `src/features/waiting-room/use-room-presence.ts` |
| **Existing module/path references** | Existing test: **None found** for either row |
| **Expected files likely to change** | New spec under `tests/certification/realtime/` |
| **Dependencies** | WP1 |
| **Critical path** | No |
| **Acceptance criteria** | **Given** four connected participants, **When** one transport drops, **Then** the peer is marked absent and the latency is recorded as a measured value. *Evidence:* `records/CERT-PRES-02.json` carrying the measurement, never an asserted pass. |
| **Certification requirements** | CERT-PRES-01, CERT-PRES-02; profiles PROF-04, PROF-07 |
| **Risks** | Disconnect-latency observability may not exist yet (Needs discovery) |
| **Rollback strategy** | Test-only revert |
| **Estimate** | Unknown |

---

## WP6 — Watch-party stage and countdown

| Field | Value |
| --- | --- |
| **ID** | WP6 |
| **Title** | Countdown synchronization and stage progression |
| **Priority** | P1 |
| **Status** | Harness missing |
| **User journey served** | Host starts; everyone counts down together and reaches the stage together |
| **Capability matrix reference** | Source `n/a` |
| **Launch envelope reference** | Existing countdown, Tier C watch experience |
| **Owning engine(s)** | Watch Party |
| **Objective** | Prove `CERT-WP-01` (spread within the C4 budget) and `CERT-WP-02` |
| **User value** | The moment of starting together actually lands together |
| **Scope** | Instrumented countdown-zero timestamps per client; stage parity host vs member |
| **Non-scope** | Catch-up flow (`CERT-WP-03`, roadmap M2) |
| **Existing implementation/modules reused** | `src/domain/countdown/countdown-runtime.ts`, `src/domain/rooms/countdown-coordinator.ts` |
| **Existing module/path references** | Existing test: **None found** for either row |
| **Expected files likely to change** | New spec under `tests/certification/room/`; instrumentation hook location Unknown |
| **Dependencies** | WP1 (instrumentation hooks, multi-identity fixture) |
| **Critical path** | No |
| **Acceptance criteria** | **Given** N participants in a started room, **When** the countdown reaches zero, **Then** the spread across clients is measured and compared to the C4 budget. *Evidence:* `records/CERT-WP-01.json` with the measured spread; `unmeasured` if no instrumentation exists. |
| **Certification requirements** | CERT-WP-01, CERT-WP-02; profiles PROF-01, PROF-02, PROF-07 |
| **Risks** | Countdown-zero timestamps may not be observable from the harness (R-02) |
| **Rollback strategy** | Test-only revert |
| **Estimate** | Unknown |

---

## WP7 — Tier C coordination correctness

| Field | Value |
| --- | --- |
| **ID** | WP7 |
| **Title** | Coordinated manual sync on web desktop |
| **Priority** | P1 |
| **Status** | Harness missing |
| **User journey served** | Room opens a provider deep link and coordinates manually |
| **Capability matrix reference** | `CAP-OTT-WEBDESK` (Tier C, launch) |
| **Launch envelope reference** | Tier C only; existing provider launcher |
| **Owning engine(s)** | Sync |
| **Objective** | Prove `CERT-SYNC-C-01`: deep link opens, countdown coordinates, no false-sync UI |
| **User value** | Honest expectations — the product never implies control it does not have |
| **Scope** | Deep-link launch assertion plus UI assertion that no Tier A control affordance is shown |
| **Non-scope** | Any Tier A/Tier B control path; ADR-014 prohibits OTT playback control |
| **Existing implementation/modules reused** | `src/domain/providers/provider-launcher.ts`, `src/domain/providers/provider-tier.ts` |
| **Existing module/path references** | Existing test: `tests/certification/provider/capability-tier.spec.ts` (tier classification only, not this row) |
| **Expected files likely to change** | New spec under `tests/certification/provider/` |
| **Dependencies** | WP1 |
| **Critical path** | No |
| **Acceptance criteria** | **Given** a Tier C provider selection, **When** the room starts, **Then** the deep link opens and no playback-control affordance is rendered. *Evidence:* `records/CERT-SYNC-C-01.json`. |
| **Certification requirements** | CERT-SYNC-C-01; profile PROF-01 |
| **Risks** | External provider navigation in CI may be non-deterministic |
| **Rollback strategy** | Test-only revert |
| **Estimate** | Unknown |

---

## WP8 — Web-mobile certification surface

| Field | Value |
| --- | --- |
| **ID** | WP8 |
| **Title** | Execution environment for the web-mobile Tier C row |
| **Priority** | P2 |
| **Status** | Environment unavailable |
| **User journey served** | Same as WP7, on a mobile viewport |
| **Capability matrix reference** | `CAP-OTT-WEBMOB` (Tier C, launch) |
| **Launch envelope reference** | Launch envelope states web desktop first; the row set nonetheless contains a web-mobile row |
| **Owning engine(s)** | Sync |
| **Objective** | Determine whether `CERT-SYNC-C-02` can execute at all |
| **User value** | None until executable |
| **Scope** | Identify the smallest change that gives the row an execution environment |
| **Non-scope** | Native Android/iOS shells; device farms; new infrastructure |
| **Existing implementation/modules reused** | `playwright.config.ts` |
| **Existing module/path references** | `web-mobile` Playwright project: **None found** |
| **Expected files likely to change** | `playwright.config.ts` — permissibility under the M0.5 infrastructure limit is Unknown |
| **Dependencies** | WP1; governance ruling on the M0.5 Constitutional Limit |
| **Critical path** | No |
| **Acceptance criteria** | **Given** a governance ruling permitting the harness-config change, **When** the row runs, **Then** it emits a measured record. Absent the ruling, the row is recorded as `blocked` naming the missing environment. *Evidence:* `records/CERT-SYNC-C-02.json`. |
| **Certification requirements** | CERT-SYNC-C-02; profile PROF-01 |
| **Risks** | Blocked by policy if the M0.5 limit forbids harness-config changes (R-03, R-06) |
| **Rollback strategy** | Revert the Playwright project entry |
| **Estimate** | Unknown |

---

## WP9 — Provider disclosure and fallback

| Field | Value |
| --- | --- |
| **ID** | WP9 |
| **Title** | Tier disclosure on every surface and reversible degraded mode |
| **Priority** | P1 |
| **Status** | Harness missing |
| **User journey served** | User picks a provider and is told exactly what sync they will get |
| **Capability matrix reference** | All rows in `docs/blueprint/B-capability-matrix.md` |
| **Launch envelope reference** | Existing provider launcher; no provider expansion |
| **Owning engine(s)** | Provider |
| **Objective** | Prove `CERT-PROV-01` and `CERT-PROV-02` |
| **User value** | No user is surprised by what the product cannot do |
| **Scope** | Disclosure assertion per capability row; one-step announced reversible fallback under fault injection |
| **Non-scope** | Changing provider classification, tier evidence, or the provider set |
| **Existing implementation/modules reused** | `src/domain/providers/provider-tier.ts`, `src/domain/providers/provider-launcher.ts` |
| **Existing module/path references** | Existing test: `tests/certification/provider/capability-tier.spec.ts` (does not emit these row IDs) |
| **Expected files likely to change** | New spec under `tests/certification/provider/` |
| **Dependencies** | WP1 |
| **Critical path** | No |
| **Acceptance criteria** | **Given** every launch capability row, **When** the selection surface renders, **Then** tier and consequence are stated before commit. *Evidence:* `records/CERT-PROV-01.json` covering 100% of B-matrix launch rows. |
| **Certification requirements** | CERT-PROV-01, CERT-PROV-02; profile PROF-01 plus a fault-injection profile — mapping is Needs discovery |
| **Risks** | Fault injection for degraded mode may have no existing mechanism |
| **Rollback strategy** | Test-only revert |
| **Estimate** | Unknown |

---

## WP10 — Experience: accessibility and reduced motion

| Field | Value |
| --- | --- |
| **ID** | WP10 |
| **Title** | WCAG 2.1 AA sweep and reduced-motion conformance |
| **Priority** | P1 |
| **Status** | Partially complete |
| **User journey served** | Every user, on every launch surface |
| **Capability matrix reference** | Source `n/a` |
| **Launch envelope reference** | Existing branding; all launch surfaces |
| **Owning engine(s)** | Experience |
| **Objective** | Prove `CERT-EXP-01` (zero AA violations) and `CERT-EXP-02` (motion respects the OS preference) |
| **User value** | The product is usable by everyone at launch |
| **Scope** | Extend the existing axe sweep to all launch surfaces; assert reduced-motion behavior |
| **Non-scope** | Visual redesign, new components |
| **Existing implementation/modules reused** | `tests/certification/accessibility/a11y-sweep.spec.ts` (exists; coverage of all launch surfaces is Unknown) |
| **Existing module/path references** | Evidence for `CERT-EXP-01` in `RUN-M0R-001`: Unknown until per-record inspection |
| **Expected files likely to change** | `tests/certification/accessibility/a11y-sweep.spec.ts`; a new reduced-motion spec |
| **Dependencies** | WP1 for the evidence writer contract only |
| **Critical path** | No |
| **Acceptance criteria** | **Given** every launch surface, **When** the axe sweep runs, **Then** zero AA violations are recorded. **Given** `prefers-reduced-motion: reduce`, **When** any animated surface renders, **Then** motion is suppressed. *Evidence:* `records/CERT-EXP-01.json`, `records/CERT-EXP-02.json`. |
| **Certification requirements** | CERT-EXP-01, CERT-EXP-02; profile PROF-01 |
| **Risks** | Manual screen-reader pass is required by K and cannot be automated |
| **Rollback strategy** | Test-only revert |
| **Estimate** | Unknown |

---

## Voice — not an M1 work package

`CERT-VOICE-01` and `CERT-VOICE-02` are **Blocked by dependency** on PROF-08, which `tests/certification/profiles/certification-profiles.ts` marks unsupported, and which `docs/debt/debt-register.json` schedules at milestone M3 under `DEBT-005`. They are documented, not delivered, in M1. See `M1-Risk-Register.md`.

---

M1 implementation was not performed. M1 remains pending explicit human authorization.
