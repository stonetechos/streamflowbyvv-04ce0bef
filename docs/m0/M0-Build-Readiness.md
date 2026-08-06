# M0 — Build Readiness

Audit date: 2026-08-06
Authority: StreamFlow v2.0 Architecture Constitution v2.0.0
Question: **"Is the current implementation ready to begin milestone-based development under the Constitution?"**

## Answer

**No — not yet.** Two blocking conditions must be cleared first. Neither is a feature; both are small-to-medium and neither requires touching schema or UI.

This is a _narrow_ no. The architecture is sound. What is missing is the machinery the Constitution uses to hold the architecture accountable.

## Why not

### Blocker 1 — The Constitution's central rule is violated in code

[B.4](../blueprint/B-capability-matrix.md) states that a provider name never automatically qualifies for a tier, and that Tier A requires a capability tuple plus a passing certification record.

`src/domain/providers/provider-tier.ts` returns Tier A for four provider keys — `youtube`, `local_file`, `local`, `google_drive` — by name matching alone. No `embed-player-adapter`, `local-file-adapter`, or `drive-file-adapter` exists. No embedded player surface of any kind exists in the tree. No `CAP-*` identifier appears in any source file.

The product therefore asserts controllable playback it cannot perform. This is the one thing [C5](../blueprint/C5-product-principles.md) says StreamFlow must never do.

Milestone-based development cannot begin on top of a false capability claim, because M1 onward will build against that claim.

**Clearing condition** `provider-tier.ts` stops returning `"a"` until an adapter exists and a CERT row passes. Four providers demote to Tier C, which is their evidenced tier. Small change; no UI, no schema. See [M0-Provider-Capability-Baseline.md](./M0-Provider-Capability-Baseline.md) PROV-A1.

### Blocker 2 — There is no way to certify anything

The Constitution defines a milestone's Definition of Done as a certification result ([K.7](../blueprint/K-launch-certification.md)). The repository contains **no** automated test of any kind: zero `*.test.*`, zero `*.spec.*`, no test runner in `package.json`. The only executable guard is `scripts/check-architecture.mjs`. `bun run verify` runs format, lint, and that guard.

Fourteen K.4 rows declare "Full (Playwright)" automation. None has a committed harness. The nine K.5 certification profiles exist only as prose. All 28 [C4](../blueprint/C4-performance-budget.md) metrics read `TBD`, and per C4.1 rule 3 that means **no certification row is currently gating on performance at all**.

Prior sprints did produce Playwright runs, and they did observe correct behaviour. But those scripts live nowhere in this repository. Under K.4's evidence column, an unreproducible run is not evidence. That is why [M0-Certification-Baseline.md](./M0-Certification-Baseline.md) records **zero PASS rows out of 34**.

Beginning M1 without this means every milestone would close on assertion rather than evidence — which is precisely the failure mode the Constitution was frozen to prevent.

**Clearing condition** A committed certification harness expressing the nine K.5 profiles, plus the first five C4 baselines. See [M0-Technical-Debt-Prioritization.md](./M0-Technical-Debt-Prioritization.md) DEBT-018, DEBT-004, DEBT-003.

## What is genuinely ready

It is worth being precise about how much of the foundation holds, because the two blockers above should not be read as a verdict on the codebase.

| Area                             | Status                                              | Evidence                                                                                                                                                                                                        |
| -------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layer separation                 | **Sound**                                           | `bun run arch:check` passes: no vendor symbol escapes Infrastructure. 499 files, all mapped, zero unmapped.                                                                                                     |
| Server authority over room state | **Confirmed**                                       | `public.room_state` with RLS: members read, host/co-host update only, version trigger on every write. No client bypass path found.                                                                              |
| WebRTC discipline                | **Confirmed**                                       | Zero occurrences of `publishData`, `DataPacket`, `dataChannel`, `RTCPeer`. LiveKit carries audio only. No room state, playback authority, or durable event crosses the peer transport.                          |
| Compliance posture               | **Sound**                                           | No accessibility-service automation, no overlay automation, no screen capture, no Cast/AirPlay control, no scraping. ADR-014's ceiling is respected everywhere.                                                 |
| Honest UI                        | **Sound**                                           | No control affordance is offered for content StreamFlow cannot control. Catch-up guidance advises a human; it never issues a command.                                                                           |
| Vendor isolation                 | **Sound**                                           | Supabase confined to `infrastructure/supabase/`, LiveKit to `infrastructure/voice/`, LLM vendors to `infrastructure/ai/`. Portability per [G](../blueprint/G-platform-foundation.md) is real, not aspirational. |
| Domain engine coverage           | **11 of 13 implemented**, 2 contract-only by design | See [M0-Architecture-Conformance-Report.md](./M0-Architecture-Conformance-Report.md)                                                                                                                            |
| Experience subsystem boundary    | **Confirmed**                                       | No module under `design-system/`, `foundation/accessibility/`, or `foundation/theme/` touches business state. One exception noted (`waiting-room-state.ts`, DEBT-020).                                          |

Overall Constitution conformance: **51%**. That figure is depressed almost entirely by the two blockers — the capability-tier violation and the absent certification machinery. Layering conformance alone, measured separately, is near-complete.

## What is explicitly _not_ a blocker

To keep the path short, the following were considered and rejected as gating:

- **Chat and Moderation are unimplemented** — contract-only by Constitution. Conformant.
- **Tier B is dead code** — safe. The system underclaims rather than overclaims.
- **`waiting-room/` spans five engines** — organisational, not architectural. Domain separation is intact. Refactoring it during a conformance audit would destroy the baseline just measured.
- **No native shell** — post-launch by [D](../blueprint/D-milestone-roadmap.md).
- **Foundation Spec is missing** — a documentation gap resolvable by ADR, not a code condition.

## Path to authorization

Three steps, in order. None involves new product capability.

**Step 1 — M0 completion (documentation + one demotion)**

- Demote name-based Tier A in `provider-tier.ts` (DEBT-002)
- Supersede the missing Foundation Spec by ADR (DEBT-001)
- Backfill the [I.3](../blueprint/I-governance.md) header on ADRs 001–014 (DEBT-005)

**Step 2 — Sprint 86 (the certification enablement sprint)**

- Commit a certification harness (DEBT-018)
- Express the nine K.5 profiles as runnable configurations (DEBT-004)
- Produce the first five C4 measured baselines (DEBT-003)
- Issue the auth-ownership ADR (DEBT-019)

**Step 3 — Re-run M0 conformance**
Re-score against the same criteria. Expected conformance after Steps 1–2: **75–80%**, with Sync and Provider moving from FAIL to PARTIAL and the certification baseline moving from 0 PASS to a real, if partial, tally.

At that point Build Mode should be authorized.

## Statement of record

> As of 2026-08-06, StreamFlow's implementation is **architecturally conformant and evidentially unproven**. The layering, server authority, transport discipline, and compliance posture required by the Constitution are all present and verifiable. What is absent is a capability classification that tells the truth, and any mechanism capable of producing evidence.
>
> **Build Mode is not authorized.** The recommended path is one small correctness fix, two documentation actions, and one enablement sprint — after which authorization should follow.
