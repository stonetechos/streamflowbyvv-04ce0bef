# K — Launch Certification

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0. **This document is the Definition of Done for every milestone.**

## K.1 Certification philosophy

Certification is a **release gate, not a QA activity**. A capability is not complete when it works once on a developer machine; it is complete when a certification record shows it passing, under named conditions, against a threshold, with evidence, owned by a named engine, on a recorded date.

Consequences:

- "It works" is not a status. `Pass`, `Fail`, `Not run`, `Expired` are statuses.
- Absence of a certification record is treated identically to a failing record.
- Certification records expire. An expired record blocks the gate it protects.
- A capability claim in any other chapter that lacks a record here is a documentation defect.

## K.2 Certification types

| Type                 | Question it answers                                                       |
| -------------------- | ------------------------------------------------------------------------- |
| Functional           | Does the capability do what the spec says?                                |
| Integration          | Does it hold across engine boundaries?                                    |
| Realtime             | Does shared state converge for all participants?                          |
| Performance          | Does it meet its Certified Threshold in [C4](./C4-performance-budget.md)? |
| Accessibility        | WCAG 2.1 AA, keyboard, screen reader, reduced motion, targets, contrast   |
| Regression           | Does previously certified behaviour still hold?                           |
| Reliability          | Does it survive adverse profiles and recover?                             |
| Manual exploratory   | Does it feel right to a human running the real journey?                   |
| Production readiness | Observability, rollback, error budgets, compliance review                 |

## K.3 Ownership by engine

| Engine       | Owns certification for                                                         |
| ------------ | ------------------------------------------------------------------------------ |
| Room         | Invite resolution, room join, capacity, lifecycle transitions, leave/rejoin    |
| Timeline     | Event ordering, sequence integrity, replay correctness                         |
| Watch Party  | Stage progression, countdown synchronization, catch-up flow                    |
| Sync         | Clock offset, start alignment, drift detection, buffer handling                |
| Voice        | Voice join, denial fallback, reconnect, device switching                       |
| Chat         | Message delivery, ordering, moderation hooks (contract-only until implemented) |
| Presence     | Presence accuracy, readiness propagation, disconnect detection                 |
| Provider     | Capability tier resolution, disclosure, deep-link launch, degraded fallback    |
| Notification | Delivery, badge accuracy, deduplication                                        |
| Community    | Friend/invite lifecycle, block enforcement                                     |
| AI/Po        | Intent safety, compliance refusal, clarification behaviour                     |
| Analytics    | Event completeness and schema conformance                                      |
| Moderation   | Report handling, enforcement actions (contract-only until implemented)         |
| Experience   | Accessibility, motion, reduced-motion, empty/loading state correctness         |

## K.4 The Launch Certification Matrix

**Every row must carry all thirteen columns. A row missing any column is not a valid certification record.**

| #   | Column                  | Notes                                                      |
| --- | ----------------------- | ---------------------------------------------------------- |
| 1   | Capability              | What is being certified                                    |
| 2   | Platform                | web-desktop / web-mobile / android / ios                   |
| 3   | Source / Provider       | Capability ID from [B](./B-capability-matrix.md), or `n/a` |
| 4   | Required Result         | The observable outcome that constitutes success            |
| 5   | Measurement Method      | How it is observed and recorded                            |
| 6   | Pass Threshold          | The Certified Threshold, from C4 where applicable          |
| 7   | Owner                   | Owning engine from K.3                                     |
| 8   | Automation Support      | Full / Partial / None, plus harness                        |
| 9   | Manual Validation       | Required / Optional / None                                 |
| 10  | Failure Classification  | Blocker / Major / Minor / Cosmetic                         |
| 11  | Evidence Link           | Run artifact, trace, or baseline reference                 |
| 12  | Last Tested             | Date and build identifier                                  |
| 13  | Blocking / Non-blocking | Whether a failure stops the release gate                   |

### Matrix (M0 populates columns 5–13 with measured values)

| Capability                              | Platform    | Source            | Required Result                                                           | Measurement Method                       | Pass Threshold             | Owner        | Automation        | Manual        | Failure Class | Evidence | Last Tested | Blocking                   |
| --------------------------------------- | ----------- | ----------------- | ------------------------------------------------------------------------- | ---------------------------------------- | -------------------------- | ------------ | ----------------- | ------------- | ------------- | -------- | ----------- | -------------------------- |
| CERT-ROOM-01 Invite resolution          | web-desktop | n/a               | Invite link lands the user in the intended room, including across sign-in | Automated journey, invite → room surface | C4 invite-to-join          | Room         | Full (Playwright) | Optional      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-ROOM-02 Room join                  | web-desktop | n/a               | Member appears to all peers with correct identity and role                | Multi-client journey                     | C4 ready propagation       | Room         | Full              | Optional      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-ROOM-03 Capacity enforcement       | web-desktop | n/a               | 9th joiner is refused with a clear message                                | Automated                                | Deterministic              | Room         | Full              | None          | Major         | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-ROOM-04 Leave / rejoin             | web-desktop | n/a               | Rejoin within grace restores room context                                 | Automated, Leave/Rejoin profile          | C4 rejoin restoration      | Room         | Full              | Optional      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-PRES-01 Lobby readiness            | web-desktop | n/a               | Readiness state is identical for all participants                         | Multi-client assertion                   | C4 ready propagation       | Presence     | Full              | None          | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-PRES-02 Disconnect detection       | web-desktop | n/a               | Dropped member is marked absent within threshold                          | Temporary Disconnect profile             | ≤ 10 s                     | Presence     | Full              | None          | Major         | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-WP-01 Countdown synchronization    | web-desktop | n/a               | All participants reach zero within spread                                 | Instrumented timestamps                  | C4 countdown spread        | Watch Party  | Full              | Manual sanity | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-WP-02 Stage progression            | web-desktop | n/a               | Stages advance identically for host and members                           | Multi-client journey                     | Deterministic              | Watch Party  | Full              | Optional      | Major         | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-WP-03 Catch-up flow                | web-desktop | n/a               | Catch-up guidance converges the user within tolerance                     | Instrumented                             | C4 catch-up convergence    | Watch Party  | Partial           | Required      | Major         | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-SYNC-A-01 Tier A playback ordering | web-desktop | CAP-EMBED-WEBDESK | Play/pause/seek propagate and align                                       | Instrumented multi-client                | C4 start alignment + drift | Sync         | Full              | Required      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-SYNC-A-02 Tier A playback ordering | web-desktop | CAP-LOCAL-WEBDESK | Play/pause/seek propagate and align                                       | Instrumented multi-client                | C4 start alignment + drift | Sync         | Full              | Required      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-SYNC-A-03 Tier A playback ordering | web-mobile  | CAP-LOCAL-WEBMOB  | Play/pause/seek propagate and align                                       | Instrumented multi-client                | C4 start alignment + drift | Sync         | Partial           | Required      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-SYNC-A-04 Tier A playback ordering | web-desktop | CAP-DRIVE-WEBDESK | Play/pause/seek propagate and align                                       | Instrumented multi-client                | C4 start alignment + drift | Sync         | Partial           | Required      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-SYNC-B-01 Observation accuracy     | web-mobile  | CAP-EMBED-WEBMOB  | Reported position tracks reality; no control affordances shown            | Instrumented + UI assertion              | C4 drift detection         | Sync         | Partial           | Required      | Major         | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-SYNC-B-02 Observation accuracy     | android     | CAP-EMBED-ANDROID | As above                                                                  | Instrumented + UI assertion              | C4 drift detection         | Sync         | Partial           | Required      | Major         | TBD (M0) | TBD (M0)    | Non-blocking (post-launch) |
| CERT-SYNC-C-01 Coordinated manual       | web-desktop | CAP-OTT-WEBDESK   | Deep link opens, countdown coordinates, no false sync UI                  | Journey + UI assertion                   | Deterministic              | Sync         | Partial           | Required      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-SYNC-C-02 Coordinated manual       | web-mobile  | CAP-OTT-WEBMOB    | As above                                                                  | Journey + UI assertion                   | Deterministic              | Sync         | Partial           | Required      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-SYNC-C-03 Coordinated manual       | android     | CAP-OTT-ANDROID   | As above                                                                  | Journey + UI assertion                   | Deterministic              | Sync         | Partial           | Required      | Major         | TBD (M0) | TBD (M0)    | Non-blocking (post-launch) |
| CERT-SYNC-C-04 Coordinated manual       | ios         | CAP-OTT-IOS       | As above                                                                  | Journey + UI assertion                   | Deterministic              | Sync         | None              | Required      | Major         | TBD (M0) | TBD (M0)    | Non-blocking (post-launch) |
| CERT-SYNC-C-05 Live coordinated manual  | web-desktop | CAP-LIVE-ANY      | As above                                                                  | Journey                                  | Deterministic              | Sync         | Partial           | Required      | Minor         | TBD (M0) | TBD (M0)    | Non-blocking               |
| CERT-SYNC-04 Drift recovery             | web-desktop | Tier A rows       | Drift beyond threshold is detected, announced, recoverable                | Instrumented, Packet Loss profile        | C4 drift detection         | Sync         | Full              | Optional      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-SYNC-05 Buffer handling            | web-desktop | Tier A rows       | Buffering does not desynchronize the room permanently                     | Instrumented, High Latency               | C4 steady-state drift      | Sync         | Partial           | Required      | Major         | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-VOICE-01 Voice join                | web-desktop | n/a               | Voice connects and audio flows both ways                                  | Automated + manual audio check           | C4 voice connection        | Voice        | Partial           | Required      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-VOICE-02 Denial fallback           | web-desktop | n/a               | Permission denial yields a clear recoverable state                        | Automated with denied permission         | C4 denial handling         | Voice        | Full              | Optional      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-VOICE-03 Voice reconnect           | web-desktop | n/a               | Audio restores after transport loss                                       | Temporary Disconnect profile             | C4 voice reconnect         | Voice        | Partial           | Required      | Major         | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-RT-01 Reconnect                    | web-desktop | n/a               | Projection rebuilds, no duplicate or lost events                          | Temporary Disconnect + Packet Loss       | C4 reconnect recovery      | Timeline     | Full              | Optional      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-RT-02 Event ordering               | web-desktop | n/a               | Sequence is monotonic and collision-free under concurrency                | Concurrency harness                      | Zero collisions            | Timeline     | Full              | None          | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-NOTIF-01 Notification delivery     | web-desktop | n/a               | Invite, acceptance, friend events deliver with accurate badges            | Automated journey                        | ≤ 5 s p95                  | Notification | Full              | Optional      | Major         | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-PROV-01 Provider disclosure        | all         | all B rows        | Capability tier and consequence stated before commit                      | UI assertion per capability row          | 100% of rows               | Provider     | Full              | Optional      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-PROV-02 Degraded-mode handling     | web-desktop | all B rows        | One-step fallback, announced, reversible                                  | Fault injection                          | Deterministic              | Provider     | Partial           | Required      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-COMM-01 Block enforcement          | web-desktop | n/a               | Blocked users cannot invite or join                                       | Automated                                | Deterministic              | Community    | Full              | None          | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-PO-01 Compliance refusal           | web-desktop | n/a               | Po refuses prohibited actions and explains why                            | Prompt suite                             | 100% refusal               | AI/Po        | Full              | Required      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-EXP-01 Accessibility               | web-desktop | n/a               | WCAG 2.1 AA on all launch surfaces                                        | Automated axe + manual SR pass           | Zero AA violations         | Experience   | Partial           | Required      | Blocker       | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-EXP-02 Reduced motion              | all         | n/a               | Motion respects the OS preference everywhere                              | Automated                                | 100%                       | Experience   | Full              | Optional      | Major         | TBD (M0) | TBD (M0)    | Blocking                   |
| CERT-ANL-01 Analytics conformance       | all         | n/a               | Emitted events match the schema, no PII                                   | Schema validation                        | Zero violations            | Analytics    | Full              | None          | Major         | TBD (M0) | TBD (M0)    | Blocking                   |

## K.5 Certification profiles

Profiles are **defined once here and referenced by certification rows**. Milestones must not hardcode test scenarios; they reference profiles.

| Profile                     | Simulation method                                     | Expected system behaviour                                                                                    |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Normal Network**          | Unthrottled, < 30 ms RTT, no loss                     | Full capability; all Certified Thresholds apply as written                                                   |
| **High Latency**            | 300–600 ms RTT symmetric                              | Thresholds relax only where a row says so; countdown spread and ordering must still hold                     |
| **Packet Loss**             | 3–8% random loss                                      | No permanent desync; recovery without user action; drift announced                                           |
| **Temporary Disconnect**    | Transport severed 5–30 s, then restored               | Room survives; projection rebuilds; no duplicate or lost events; restoration announced                       |
| **Background / Foreground** | App backgrounded ≥ 60 s, then resumed                 | Correct state on resume within C4 foreground resume; no stale playback claim                                 |
| **Late Join**               | Participant joins a room already `active`             | Correct stage rendered, correct tier disclosure, correct position awareness                                  |
| **Leave / Rejoin**          | Participant leaves deliberately, rejoins within grace | Context restored; membership and role preserved                                                              |
| **Host Disconnect**         | Host transport severed ≥ 30 s                         | Room remains recoverable; authority handling is explicit and announced; room is never destroyed within grace |
| **Member Disconnect**       | One non-host member severed ≥ 30 s                    | Room continues unaffected for others; absent member shown as absent                                          |

Every certification row must declare the profiles it is required to pass under. A row certified only under Normal Network is explicitly marked as such and cannot be Blocking at the Production gate.

## K.6 Gates

| Gate                  | Requirement                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alpha**             | Functional rows pass under Normal Network. Failures may be Major.                                                                                  |
| **Beta**              | All Blocking rows pass under Normal Network, High Latency, Temporary Disconnect, Late Join. Accessibility automated pass.                          |
| **Release Candidate** | All Blocking rows pass under every applicable profile. All Certified Thresholds set and met. Manual validation complete. Compliance review signed. |
| **Production**        | RC plus: no expired records, observability in place, rollback rehearsed, technical debt register reviewed.                                         |

Every milestone in [D](./D-milestone-roadmap.md) declares the gate it must reach.

## K.7 Release gate

A milestone completes only when **all** hold:

1. Every Blocking certification row for the milestone is `Pass`, within expiry, with an Evidence Link and a Last Tested date.
2. Every applicable [C4](./C4-performance-budget.md) metric has a Certified Threshold and meets it.
3. Every [C5](./C5-product-principles.md) product principle holds; no principle is waived.
4. The [Launch Envelope](./A-product-operating-brief.md#a7-launch-envelope) is respected; nothing outside it shipped.
5. No contradiction exists with any Accepted ADR, ADR-014 included.
6. Every Tier A row in [B](./B-capability-matrix.md) has a matching passing record here.

Any failure blocks the milestone. Exceptions require a numbered ADR recorded before release, not after.

## K.8 Cross-references

[A — Product Operating Brief](./A-product-operating-brief.md) · [B — Capability Matrix](./B-capability-matrix.md) · [C — Engine Pack](./C-engine-pack.md) · [C2 — Experience Engine](./C2-experience-engine.md) · [C3 — State Management](./C3-state-management.md) · [C4 — Performance Budget](./C4-performance-budget.md) · [C5 — Product Principles](./C5-product-principles.md) · [D — Milestone Roadmap](./D-milestone-roadmap.md) · [F — Reality Check](./F-reality-check.md) · [I — Governance](./I-governance.md) · [J — Technical Debt](./J-technical-debt.md) · ADR-014 · [ADR-015](./ADR-015-engine-decomposition.md)
