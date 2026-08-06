# D — Milestone Delivery Roadmap

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0.

## D.0 Rules

1. Milestones **do not hardcode test scenarios**. Each references the applicable [certification profiles](./K-launch-certification.md#k5-certification-profiles) and certification rows.
2. Each milestone declares the [gate](./K-launch-certification.md#k6-gates) it must reach.
3. Each milestone declares its position inside the [Launch Envelope](./A-product-operating-brief.md#a7-launch-envelope).
4. Already-shipped v1.0 work is the completed baseline, not new scope.
5. No milestone starts until the previous one passes the [release gate](./K-launch-certification.md#k7-release-gate).

---

## M0 — Architecture Conformance and Certification

**This milestone gates all implementation.** Nothing else begins until it passes.

**Gate required:** Alpha for the conformance harness, plus a complete certification and baseline inventory.

Work by engine:

| Engine         | M0 work                                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| All            | Verify the module mapping in [C](./C-engine-pack.md); no shipped module orphaned                                                                      |
| All            | Verify no dependency cycles and no vendor types in contracts (`arch:check`)                                                                           |
| All            | Confirm owned state classes match [C3](./C3-state-management.md)                                                                                      |
| Sync, Provider | Re-express every tier claim as a `source · adapter · platform · version` row in [B](./B-capability-matrix.md); demote any Tier A row lacking a record |
| All            | Populate columns 5–13 of every certification row in [K](./K-launch-certification.md)                                                                  |
| All            | Implement the nine certification profiles as reusable harness configurations                                                                          |
| All            | Measure a real baseline for every metric in [C4](./C4-performance-budget.md) and set Certified Thresholds                                             |
| Experience     | Full WCAG 2.1 AA audit of shipped surfaces                                                                                                            |
| Governance     | Freeze the constitution at v2.0.0; backfill ADR headers per [I.3](./I-governance.md#i3-mandatory-adr-header)                                          |

**Exit criteria.** Conformance clean · profiles runnable · every metric has a Measured Baseline · every Blocking row has a Certified Threshold · every Tier A row has a passing record or has been demoted · constitution frozen.

---

## M1 — Private Watch Room

**Gate:** Beta. **Envelope:** 2–8 people, web desktop, Tier C default with certified Tier A rows where available.

| Engine      | Work                                                             |
| ----------- | ---------------------------------------------------------------- |
| Room        | Harden invite resolution across sign-in, install, and cold start |
| Presence    | Readiness accuracy and absence detection under adverse profiles  |
| Watch Party | Stage progression and countdown scheduling                       |
| Sync        | Clock offset, countdown spread, Tier C coordination correctness  |
| Provider    | Disclosure on every surface; one-step fallback                   |
| Voice       | Join-by-default when enabled; denial fallback                    |
| Experience  | Onboarding, empty and loading states, reduced motion             |

**Profiles:** Normal, High Latency, Temporary Disconnect, Late Join, Leave/Rejoin.
**Rows:** CERT-ROOM-01..04, CERT-PRES-01..02, CERT-WP-01..02, CERT-SYNC-C-01..02, CERT-VOICE-01..02, CERT-PROV-01..02, CERT-EXP-01..02.

---

## M2 — Sync and Room Trust

**Gate:** Release Candidate for Tier A capabilities on web desktop.

| Engine      | Work                                                                        |
| ----------- | --------------------------------------------------------------------------- |
| Sync        | Tier A control path, drift detection, buffer handling, catch-up convergence |
| Timeline    | Replay correctness and sequence integrity under concurrency                 |
| Room        | Host disconnect authority handling and rejoin grace                         |
| Watch Party | Catch-up flow                                                               |

**Profiles:** all nine.
**Rows:** CERT-SYNC-A-01..02, CERT-SYNC-04..05, CERT-RT-01..02, CERT-WP-03, CERT-ROOM-04.

---

## M3 — Voice and Chat Maturity

**Gate:** Release Candidate for Voice; Beta for Chat.

| Engine     | Work                                                             |
| ---------- | ---------------------------------------------------------------- |
| Voice      | Reconnect, device switching, spatial presentation inputs         |
| Chat       | Activate the contract-only engine; delivery, ordering, retention |
| Moderation | Activate report and enforcement contracts backing Chat           |
| Experience | Voice and chat surfaces, accessibility                           |

**Rows:** CERT-VOICE-03, new CERT-CHAT-* and CERT-MOD-* rows added with this milestone.

---

## M4 — Capability Expansion

**Gate:** Release Candidate per new capability row.

Expansion is matrix-driven: each new `source · adapter · platform · version` enters [B](./B-capability-matrix.md) at Tier C / investigating, gains certification rows, and is promoted only on a passing record. Android capability rows are the priority; iOS follows Room and Voice certification.

---

## M5 — Retention

**Gate:** Beta.

Scheduling, favourites, recurring groups, re-invite flows. Engines: Community, Notification, Room, Experience.

---

## M6 — Premium and Community Controls

**Gate:** Beta.

Room-level controls, entitlements, community safety surfaces. Engines: Moderation, Community, Room, Analytics.

---

## M7 — Optional AI / Po Enhancements

**Gate:** Beta. Po remains optional; every journey stays completable without it (Launch Envelope exclusion).

Engines: AI/Po, Analytics.

---

## D.1 Completed baseline (v1.0, not re-scoped)

Auth and profiles · friends and invitations · home and service shelf · lobby and waiting room · QR and link invites · countdown runtime · LiveKit voice · presence · room lifecycle · provider launcher and tier model · Po brain · notifications · design language and branding · realtime channel registry · ADRs 001–014.

M0 re-certifies this baseline against the constitution rather than rebuilding it.
