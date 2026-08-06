# M0 — Certification Baseline

Audit date: 2026-08-06
Build: `streamflow` v1.0.0-rc.1
Authority: [K-launch-certification.md](../blueprint/K-launch-certification.md), matrix K.4

## Reading rule

This document populates the Launch Certification Matrix with **today's** state.

- **PASS** — capability implemented *and* a reproducible artifact exists in the repository.
- **PARTIAL** — capability implemented, no reproducible artifact, or evidence exists only for some profiles.
- **FAIL** — capability implemented incorrectly, or asserted without a control surface.
- **NOT IMPLEMENTED** — no module owns it.
- **Unknown** — cannot be determined without measurement. **Unknown values remain Unknown.** No result in this document is inferred, estimated, or carried forward from a prior sprint report.

### Evidence standard applied

Earlier sprints (notably the Production Certification Sprint) recorded PASS results from Playwright runs executed in an ephemeral agent sandbox. **None of those scripts or artifacts is committed to this repository.** Under [K.4](../blueprint/K-launch-certification.md) column 11 ("Evidence Link — run artifact, trace, or baseline reference"), an uncommitted, unreproducible run is not evidence. Those results are therefore recorded here as **PARTIAL — behaviour observed, evidence not retained**, not as PASS.

This is the single most consequential finding of the certification baseline: **zero rows qualify as PASS.**

## Matrix

| Row | Capability | Platform | Source | Status | Evidence available today | Notes |
|---|---|---|---|---|---|---|
| CERT-ROOM-01 | Invite resolution | web-desktop | n/a | PARTIAL | Implementation: `pending-destination.ts`, `auth.callback.tsx`, `join.$code.tsx`. Behaviour observed in prior sprints; no committed artifact. | Cross-sign-in continuation implemented |
| CERT-ROOM-02 | Room join | web-desktop | n/a | PARTIAL | `room-flow-service.ts`, `supabase-room-member-repository.ts`, RLS policies | Multi-client assertion not automated |
| CERT-ROOM-03 | Capacity enforcement | web-desktop | n/a | PARTIAL | ADR-013 + member occupancy checks in `room-flow-service.ts` | Constitution envelope is 2–8; code path exists, 9th-joiner refusal unautomated |
| CERT-ROOM-04 | Leave / rejoin | web-desktop | n/a | PARTIAL | Host-leave logic present; grace window not parameterised as a profile | Leave/Rejoin profile not runnable |
| CERT-PRES-01 | Lobby readiness | web-desktop | n/a | PARTIAL | `ready-coordinator.ts`, `use-room-ready.ts`, realtime channel registry | Identical-state assertion not automated |
| CERT-PRES-02 | Disconnect detection | web-desktop | n/a | **Unknown** | Presence repository exists; no named ≤ 10 s threshold constant found | Threshold neither expressed nor measured |
| CERT-WP-01 | Countdown synchronization | web-desktop | n/a | PARTIAL | `countdown-machine.ts`, `countdown-runtime.ts`, server time source | Spread never instrumented — see Performance Baseline |
| CERT-WP-02 | Stage progression | web-desktop | n/a | PARTIAL | `waiting-room-state.ts` five-stage reveal | Stage authority sits in presentation (GAP-009) |
| CERT-WP-03 | Catch-up flow | web-desktop | n/a | PARTIAL | `catch-up-sheet.tsx`, `drift-engine.ts` | Convergence unmeasured; guidance is advisory by design |
| CERT-SYNC-A-01 | Tier A ordering | web-desktop | CAP-EMBED-WEBDESK | **FAIL** | **No `embed-player-adapter` exists.** No embedded player surface anywhere in `src/`. | Tier A asserted by name in `provider-tier.ts` without a control surface — GAP-001 |
| CERT-SYNC-A-02 | Tier A ordering | web-desktop | CAP-LOCAL-WEBDESK | **FAIL** | **No `local-file-adapter` exists.** | As above |
| CERT-SYNC-A-03 | Tier A ordering | web-mobile | CAP-LOCAL-WEBMOB | **NOT IMPLEMENTED** | — | No adapter, no platform discrimination |
| CERT-SYNC-A-04 | Tier A ordering | web-desktop | CAP-DRIVE-WEBDESK | **FAIL** | **No `drive-file-adapter` exists**, yet `google_drive` resolves Tier A. | As above |
| CERT-SYNC-B-01 | Observation accuracy | web-mobile | CAP-EMBED-WEBMOB | NOT IMPLEMENTED | `hasMediaSessionObservation` is never set true by any runtime | Tier B is dead code — GAP-011 |
| CERT-SYNC-B-02 | Observation accuracy | android | CAP-EMBED-ANDROID | NOT IMPLEMENTED | No Android shell | Non-blocking (post-launch) |
| CERT-SYNC-C-01 | Coordinated manual | web-desktop | CAP-OTT-WEBDESK | PARTIAL | `deep-link-registry.ts`, `deep-link-service.ts`, `manual-sync-guidance.ts`, `provider-launch-coordinator.ts`. UI shows no control affordance for OTT. | The one genuinely working sync mode. Unautomated. |
| CERT-SYNC-C-02 | Coordinated manual | web-mobile | CAP-OTT-WEBMOB | PARTIAL | Same modules; responsive surfaces present | Not platform-discriminated in code |
| CERT-SYNC-C-03 | Coordinated manual | android | CAP-OTT-ANDROID | NOT IMPLEMENTED | Capacitor-compatible, not shipped | Non-blocking |
| CERT-SYNC-C-04 | Coordinated manual | ios | CAP-OTT-IOS | NOT IMPLEMENTED | — | Non-blocking |
| CERT-SYNC-C-05 | Live coordinated manual | web-desktop | CAP-LIVE-ANY | **Unknown** | No live/linear content path identified in the catalog | Non-blocking |
| CERT-SYNC-04 | Drift recovery | web-desktop | Tier A rows | **NOT IMPLEMENTED** | Depends on Tier A rows that do not exist | Cannot be evaluated |
| CERT-SYNC-05 | Buffer handling | web-desktop | Tier A rows | **NOT IMPLEMENTED** | As above | Cannot be evaluated |
| CERT-VOICE-01 | Voice join | web-desktop | n/a | PARTIAL | `livekit-voice-adapter.ts`, `api/voice/token.ts`, `use-voice-session.ts`. Voice observed working. | No committed automated + manual audio check |
| CERT-VOICE-02 | Denial fallback | web-desktop | n/a | PARTIAL | Permission-denied handling in `media-devices.ts` and `voice-status.tsx` | Not automated with denied permission |
| CERT-VOICE-03 | Voice reconnect | web-desktop | n/a | **Unknown** | LiveKit default reconnect; no StreamFlow-owned recovery assertion | Temporary Disconnect profile not runnable |
| CERT-RT-01 | Reconnect | web-desktop | n/a | PARTIAL | `realtime-channel-registry`, projection subscribers | Rebuild correctness unproven |
| CERT-RT-02 | Event ordering | web-desktop | n/a | PARTIAL | Sequence-collision fix in `supabase-event-store-repository.ts` | Requires "zero collisions" under a concurrency harness that does not exist |
| CERT-NOTIF-01 | Notification delivery | web-desktop | n/a | PARTIAL | `notification-provider.tsx`, `use-notification-badges.ts`, email templates + webhook | ≤ 5 s p95 unmeasured |
| CERT-PROV-01 | Provider disclosure | all | all B rows | **FAIL** | Disclosure UI exists (`provider-session-card.tsx`, tier summary keys) but discloses a tier derived from provider name, not a certified capability. | Requirement is "capability tier stated before commit" — the stated tier is currently unsound |
| CERT-PROV-02 | Degraded-mode handling | web-desktop | all B rows | NOT IMPLEMENTED | No Tier B runtime exists to degrade from | — |
| CERT-COMM-01 | Block enforcement | web-desktop | n/a | PARTIAL | `supabase-block-repository.ts`, ADR-011, RLS policies | Deterministic and testable; not automated |
| CERT-PO-01 | Compliance refusal | web-desktop | n/a | PARTIAL | `compliance-service.ts`, `tool-catalog.ts`, `refusal-message.ts` | "100% refusal" requires a prompt suite that does not exist — GAP-005 |
| CERT-EXP-01 | Accessibility | web-desktop | n/a | **Unknown** | `foundation/accessibility/` provider and focus management present | No axe run committed; zero-violation claim unverifiable |
| CERT-EXP-02 | Reduced motion | all | n/a | **Unknown** | Motion tokens present in the design system | OS-preference coverage unverified |
| CERT-ANL-01 | Analytics conformance | all | n/a | **FAIL** | Sink abstraction only; no schema, no validation, no PII guard | Requirement is "zero violations"; nothing validates — GAP-006 |

## Tally

| Status | Rows | Share of 34 |
|---|---|---|
| PASS | **0** | 0% |
| PARTIAL | 17 | 50% |
| FAIL | 5 | 15% |
| NOT IMPLEMENTED | 8 | 23% |
| Unknown | 4 | 12% |

Blocking rows (per K.4 column 13) currently at FAIL or NOT IMPLEMENTED: **11**.

## Findings

1. **No row qualifies as PASS.** Not because the product does not work — much of it demonstrably does — but because the Constitution's evidence standard requires a retained, reproducible artifact, and the repository contains none.
2. **All five FAIL rows trace to two root causes**: name-based Tier A assertion (4 rows) and unvalidated analytics (1 row).
3. **Eight NOT IMPLEMENTED rows are structurally blocked** on either a Tier A adapter or a native shell. Six of those eight are marked Non-blocking or post-launch in K.4, which is consistent.
4. **The four Unknowns are all measurement gaps**, not capability gaps. They resolve as soon as a harness exists.
5. Per [K.7](../blueprint/K-launch-certification.md), **the release gate cannot currently be evaluated**, let alone passed.

## What would move rows to PASS fastest

In dependency order, and with no new product capability required:

1. Commit a certification harness with the nine [K.5](../blueprint/K-launch-certification.md) profiles → unblocks 17 PARTIAL rows to evaluable.
2. Demote name-based Tier A → converts 3 FAIL rows to honest NOT IMPLEMENTED, which is a conformant state.
3. Add the Po refusal prompt suite → CERT-PO-01 becomes evaluable.
4. Add emission-time schema validation → CERT-ANL-01 becomes evaluable.
