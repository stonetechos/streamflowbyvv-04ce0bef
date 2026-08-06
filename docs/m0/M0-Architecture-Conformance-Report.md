# M0 — Architecture Conformance Report

Audit date: 2026-08-06
Audited build: `streamflow` v1.0.0-rc.1, working tree at audit time
Authority: StreamFlow v2.0 Architecture Constitution v2.0.0 (frozen, `docs/blueprint/`)
Scope: inspection only. No feature, schema, or UI change was made to produce this report.

## 0. Method

- Full enumeration of the source tree: 499 files under `src/`, 496 of them TypeScript/TSX, plus 24 SQL migrations under `supabase/migrations/`.
- Static inspection of engine boundaries against [C-engine-pack.md](../blueprint/C-engine-pack.md) and [C2-experience-engine.md](../blueprint/C2-experience-engine.md).
- Execution of the repository's own guard: `bun run arch:check` → **passed** ("no vendor leakage outside Infrastructure").
- Grep-level verification of the four additional validations required by the sprint brief (§8).
- No runtime measurement was performed beyond what is recorded in [M0-Performance-Baseline.md](./M0-Performance-Baseline.md).

Classification vocabulary:

| Class               | Meaning                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **PASS**            | Engine exists, owns its stated capability, no architectural deviation found                                |
| **PARTIAL**         | Engine exists and functions, but a Constitution-required module, boundary, or evidence artifact is missing |
| **FAIL**            | Engine exists but violates a Constitution rule in a way that misrepresents capability or authority         |
| **NOT IMPLEMENTED** | No module owns the capability                                                                              |

## 1. Summary table

| #    | Engine               | Status                                    | Risk         |
| ---- | -------------------- | ----------------------------------------- | ------------ |
| C.1  | Room                 | PARTIAL                                   | Medium       |
| C.2  | Timeline             | PARTIAL                                   | Medium       |
| C.3  | Watch Party          | PARTIAL                                   | Medium       |
| C.4  | Sync                 | **FAIL**                                  | **Critical** |
| C.5  | Voice                | PARTIAL                                   | Low          |
| C.6  | Chat                 | NOT IMPLEMENTED (contract-only by design) | Low          |
| C.7  | Presence             | PARTIAL                                   | Medium       |
| C.8  | Provider             | **FAIL**                                  | **Critical** |
| C.9  | Notification         | PARTIAL                                   | Low          |
| C.10 | Community            | PARTIAL                                   | Low          |
| C.11 | AI / Po              | PARTIAL                                   | Medium       |
| C.12 | Analytics            | PARTIAL                                   | High         |
| C.13 | Moderation           | NOT IMPLEMENTED (contract-only by design) | Medium       |
| —    | Experience subsystem | PARTIAL                                   | Medium       |

Two FAIL classifications, both traceable to a single root cause: **capability is asserted by provider name without a certification record**, which [B.4](../blueprint/B-capability-matrix.md) explicitly prohibits.

## 2. Engine-by-engine findings

### C.1 Room Engine — PARTIAL

**Implemented modules**
`src/domain/rooms/` (11 files): `room-flow-service.ts`, `room-setup-service.ts`, `room-read-model.ts`, `home-read-model.ts`, `ready-coordinator.ts`, `presence-coordinator.ts`, `playback-coordinator.ts`, `countdown-coordinator.ts`, `room.types.ts`, `presence.types.ts`.
Repository contracts: `src/repository/rooms/` (5 files). Infrastructure: `src/infrastructure/supabase/rooms/` (11 files) including `supabase-unit-of-work.ts`, `supabase-code-allocator.ts`, `supabase-room-discovery-repository.ts`.
Server authority: `public.rooms`, `public.room_members`, `public.room_state` with RLS; `discover_room_by_code`, `allocate_profile_handle` DB functions.

**Missing modules**

- No room lifecycle conformance test harness; every CERT-ROOM row in [K.4](../blueprint/K-launch-certification.md) is unevidenced.
- No explicit grace-window module for `Leave/Rejoin` and `Host Disconnect` certification profiles; behaviour exists but is not parameterised as a profile input.

**Architectural deviations**

- Room lifecycle naming in code (`waiting-room` feature folder, "stage" vocabulary) predates the Constitution's Room/Watch Party split. `src/features/waiting-room/` (43 files) mixes Room, Presence, Watch Party, Sync, and Provider concerns in one feature module. This is a **presentation-layer aggregation**, not a domain-layer violation — domain modules remain separated — but it obscures engine ownership.

**Technical debt** DEBT-006 (mapping unverified — now resolved by [M0-Module-Mapping.md](./M0-Module-Mapping.md)), DEBT-009 (partial offline intent queue).

**Risk** Medium. Behaviour is sound and server-authoritative; the gap is evidentiary and organisational.

**Recommendation** Keep as-is for M1. Do not refactor `waiting-room` during M0. Add a Room certification harness in M1 and record the folder aggregation as an accepted deviation.

### C.2 Timeline Engine — PARTIAL

**Implemented modules**
`src/domain/events/` (event-bus, event-catalog, event.types), `src/repository/events/` (event-store.types, projection.types, realtime.types), `src/infrastructure/events/` (8 files: dispatch, serializer, and five subscribers), `src/infrastructure/supabase/events/` (9 files) including `supabase-event-store-repository.ts` and `supabase-activity-timeline-projection.ts`.
Event sequencing collision fix is present in the event store repository.

**Missing modules**

- No replay-correctness harness. CERT-RT-01 and CERT-RT-02 are unevidenced.
- No compaction or archival path (DEBT-015).
- No machine-validated event schema at emission boundary (shared with Analytics, DEBT-012).

**Architectural deviations** None found. Event bus is versioned and Infrastructure-isolated; `arch:check` confirms no vendor types leak upward.

**Risk** Medium — ordering correctness is claimed but unproven under concurrency.

**Recommendation** M1: build the concurrency harness that CERT-RT-02 requires before any new event producer is added.

### C.3 Watch Party Engine — PARTIAL

**Implemented modules**
`src/domain/countdown/` (countdown-machine, countdown-plan, countdown-runtime), `src/features/watch-party/` (7 files: watch-party-screen, watch-party-hud, catch-up-sheet, reaction-burst, shared-elapsed-timer, watch-party-status, use-elapsed-time), stage progression in `src/features/waiting-room/waiting-room-state.ts`.

**Missing modules**

- Reactions are presentation-only (`reaction-burst.tsx`); there is no durable reaction event in the Timeline, so reaction delivery is not certifiable.
- No instrumented countdown-spread measurement, which CERT-WP-01 requires.

**Architectural deviations**

- Stage progression state lives in a feature-layer module (`waiting-room-state.ts`) rather than a domain state machine. The countdown itself is correctly a domain machine; the surrounding five-stage reveal is not. This crosses the C2 boundary: the Experience subsystem may own reveal _motion_, but stage _authority_ belongs to the Watch Party Engine.

**Risk** Medium.

**Recommendation** M2: promote stage progression to a domain machine alongside `countdown-machine.ts`. Not an M0 action.

### C.4 Sync Engine — FAIL

**Implemented modules**
`src/domain/sync/` (clock-sync-engine, clock-sync-service, drift-engine, room-sync-coordinator, server-time-source, sync.types), `src/domain/playback/` (playback-machine, playback-runtime, playback-sync-engine, playback-drift-policy), `src/infrastructure/time/http-server-time-source.ts`, server route `src/routes/api/public/time.ts`.

**Why FAIL**

1. **There is no Tier A control surface anywhere in the tree.** A full-tree search for `<video`, `iframe`, `YT.Player`, or any embedded-player construct outside `src/components/ui/` returns **zero** matches. The Constitution's Tier A capability rows — `CAP-EMBED-WEBDESK`, `CAP-LOCAL-WEBDESK`, `CAP-LOCAL-WEBMOB`, `CAP-DRIVE-WEBDESK` — have **no implementing adapter**. `embed-player-adapter`, `local-file-adapter`, and `drive-file-adapter` named in [B](../blueprint/B-capability-matrix.md) do not exist.
2. `src/domain/providers/provider-tier.ts` nonetheless returns Tier `"a"` for the provider keys `youtube`, `local_file`, `local`, `google_drive` based on **name matching alone**, with no adapter, no platform discrimination, and no certification lookup. This is the exact construction prohibited by [B.4](../blueprint/B-capability-matrix.md) and is the code-level manifestation of DEBT-002.
3. Consequently `playback-sync-engine.ts` and `drift-engine.ts` are exercised only against coordinated-manual (Tier C) rooms in production. Their host-authoritative tick logic is correct in isolation but has never driven a real player.

**What is correct** Clock synchronisation is genuinely implemented against a server time source, not peer time. Drift is detected and surfaced honestly via `catch-up-sheet.tsx` without claiming control — this satisfies [C5](../blueprint/C5-product-principles.md) "never fake synchronization".

**Technical debt** DEBT-002 (Critical, confirmed in code), DEBT-008 (drift tolerance hardcoded, not a certified threshold).

**Risk** **Critical.** The system currently advertises a tier it cannot deliver.

**Recommendation** Blocking M0 remediation: `provider-tier.ts` must stop returning `"a"` until an adapter exists and a CERT row passes. See [M0-Gap-Analysis.md](./M0-Gap-Analysis.md) GAP-001. This is a correctness demotion, not a feature, and is the one change this sprint recommends before Build Mode.

### C.5 Voice Engine — PARTIAL

**Implemented modules**
`src/infrastructure/voice/` (8 files: livekit-voice-adapter, voice-adapter contract, voice-registry, media-devices, token-provider, supabase-voice-token-provider, register), `src/features/voice/` (11 files), server route `src/routes/api/voice/token.ts`, `src/domain/services/voice-service.ts`.

**Missing modules** Device-switching certification; reconnect measurement under the Temporary Disconnect profile.

**Architectural deviations** None. LiveKit is confined to `src/infrastructure/voice/` behind `voice-adapter.ts`; `arch:check` confirms it.

**Validation result** A tree-wide search for `publishData`, `DataPacket`, `dataChannel`, and `RTCPeer` returns **zero** matches. WebRTC carries audio only. No room state, no playback authority, and no durable event traverses the peer transport. **Conforms** to the Constitution's transport rule.

**Risk** Low.

**Recommendation** M1: add reconnect and denial-fallback automation.

### C.6 Chat Engine — NOT IMPLEMENTED (by design)

Constitution declares Chat contract-only ([C.6](../blueprint/C-engine-pack.md)). No chat module exists; no false chat affordance is presented in the UI. This is conformant. DEBT-007, scheduled M3.

**Risk** Low. **Recommendation** No M0 action.

### C.7 Presence Engine — PARTIAL

**Implemented modules**
`src/domain/rooms/presence-coordinator.ts`, `presence.types.ts`, `src/domain/services/presence-service.ts`, `src/repository/rooms/presence-repository.types.ts`, `src/infrastructure/supabase/rooms/supabase-room-presence-repository.ts`, `src/features/waiting-room/use-room-presence.ts`, `room-realtime-hub.ts`, and the `realtime-channel-registry`.

**Missing modules** No disconnect-detection threshold expressed as a certified value (CERT-PRES-02 requires ≤ 10 s; the code has no explicit named constant tied to that row).

**Architectural deviations** Channel lifecycle correctness relies on registry _discipline_ rather than an enforced contract — DEBT-011, confirmed.

**Risk** Medium — regression-prone.

**Recommendation** M2 per the debt register.

### C.8 Provider Engine — FAIL

**Implemented modules**
`src/domain/providers/` (15 files): provider-catalog-service, provider-launcher, provider-launch-coordinator, deep-link-registry, deep-link-service, manual-sync-guidance, provider-session, provider-tier, provider-control, content-reference, shared-content, provider-preference-service.
Infrastructure: `browser-provider-launcher.ts`, `supabase-provider-catalog-repository.ts`, `supabase-provider-preference-repository.ts`. Presentation: `src/features/providers/` and `src/features/home/service-shelf.ts` (17 branded services).

**Why FAIL**

1. Tier assignment is provider-name-keyed (see C.4 above). No capability tuple (`source · adapter · platform · version`) exists anywhere in the code. `CAP-*` identifiers from [B](../blueprint/B-capability-matrix.md) appear in **no** source file.
2. Tier B is gated behind a `hasMediaSessionObservation` runtime flag that no runtime currently sets — so Tier B is effectively dead code, which is _safe_ but means CERT-SYNC-B-01/02 cannot be evidenced.
3. The shelf lists 17 provider brands; the Constitution's capability matrix defines 11 capability rows. The mapping between the two sets is undocumented.

**What is correct** Deep-link launch, honest manual-sync guidance, and provider-session disclosure are implemented and match ADR-014's ceiling. No control affordance is shown for OTT providers.

**Risk** **Critical** — overstated capability.

**Recommendation** GAP-001 and GAP-002. Introduce the capability-tuple resolver in M1; demote name-based Tier A immediately.

### C.9 Notification Engine — PARTIAL

**Implemented** `src/domain/services/notification-service.ts`, `src/features/notifications/` (notification-provider, use-notification-badges, notification-badge). Email templates under `src/lib/email-templates/` (6) with the auth webhook route.

**Missing** Deduplication policy module; push transport (web push / native) absent; no delivery-latency measurement for CERT-NOTIF-01.

**Deviations** None material.

**Risk** Low. **Recommendation** M2.

### C.10 Community Engine — PARTIAL

**Implemented** `src/domain/social/` (social-service, social-read-model), `src/repository/social/`, `src/infrastructure/supabase/social/` (4 repositories: friendship, block, profile-directory, recent-partner), `src/features/social/` (10 files), `src/features/invitations/` (5 files). Block enforcement is present at both the service and RLS layer, plus ADR-011.

**Missing** Block-enforcement certification evidence (CERT-COMM-01).

**Risk** Low. **Recommendation** M1 automation.

### C.11 AI / Po Engine — PARTIAL

**Implemented** `src/features/po/brain/` (14 files: intent-engine, planning-engine, conversation-manager, tool-catalog, tool-executor, po-context, po-memory, po-situation, po-prompts, po-lexicon, po-followups, po-runtime), `src/features/po/` (tool-registry, prompt-library, po-provider, 4 components), `src/infrastructure/ai/` (llm-adapter, provider-registry, stt-adapter, tts-adapter), `src/domain/services/compliance-service.ts`.

**Missing** No automated prohibited-action prompt suite, so CERT-PO-01 ("100% refusal") is unevidenced. DEBT-016.

**Architectural deviation** Po's brain sits entirely in the Feature layer per ADR-001, which the Constitution accepts; however `po-memory.ts` holds preference state that [C3](../blueprint/C3-state-management.md) assigns to Persistent state ownership. Classify as a boundary ambiguity, not a violation.

**Risk** Medium — an unevidenced compliance guarantee is a legal-surface risk.

**Recommendation** GAP-005; the refusal suite is the single highest-value AI/Po M1 item.

### C.12 Analytics Engine — PARTIAL

**Implemented** `src/domain/services/analytics-service.ts` (sink abstraction, `AnalyticsRecord`), `src/infrastructure/events/analytics-sink-subscriber.ts` (119 lines).

**Missing** No schema registry, no emission-time validation, no PII assertion, no configured production sink. CERT-ANL-01 ("zero violations") cannot be evaluated because nothing validates.

**Risk** **High** — a PII leak here is a compliance event, and there is currently no guard.

**Recommendation** GAP-004, M1 rather than the register's M3.

### C.13 Moderation Engine — NOT IMPLEMENTED (by design)

Contract-only per Constitution. Room safety currently rests on Community block enforcement alone (DEBT-007). Conformant with the frozen document but carries **Medium** product risk at the stated launch envelope of 2–8 people.

**Recommendation** No M0 action. Revisit at M3 as scheduled.

### Experience subsystem (C2) — PARTIAL

**Implemented** `src/design-system/` (tokens + 7 components), `src/foundation/accessibility/` (provider, focus-management, types), `src/foundation/theme/`, `src/foundation/localization/` (en, hi-IN), `src/app-shell/` (boot-screen, loading-state, error-state, app-layout), `src/components/ui/` (46 shadcn primitives).

**Conformance to C2's ownership rule** Verified by inspection: no module under `design-system/`, `foundation/accessibility/`, or `foundation/theme/` reads or writes room, playback, or permission state. The Experience subsystem owns **no** business state. **Conforms.**

**Exception** `src/features/waiting-room/waiting-room-state.ts` holds stage-reveal state that blends presentation reveal with domain stage authority (see C.3).

**Missing** Continuous accessibility verification (DEBT-010); no axe automation; reduced-motion coverage unverified for CERT-EXP-02.

**Risk** Medium.

## 3. Cross-cutting findings

| ID   | Finding                                                                                                                                                                                                                                                                                                                                         | Severity     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| XC-1 | **Zero automated tests exist in the repository.** No `*.test.*`, no `*.spec.*`, no Playwright suite is committed. The only executable guard is `scripts/check-architecture.mjs`. Every one of the 34 CERT rows in [K.4](../blueprint/K-launch-certification.md) claiming "Full (Playwright)" or "Full" automation has **no** harness behind it. | **Critical** |
| XC-2 | `bun run verify` = format + lint + arch. It does not run, and cannot run, any certification. The release gate defined in [K.7](../blueprint/K-launch-certification.md) is currently unenforceable.                                                                                                                                              | **Critical** |
| XC-3 | Foundation Spec v1.0 is cited across the documentation set and is absent from the repository (DEBT-001, confirmed: no such file under `docs/`).                                                                                                                                                                                                 | High         |
| XC-4 | ADRs 001–014 lack the mandatory header from [I.3](../blueprint/I-governance.md) (dependencies, superseded, affected engines, affected milestones). Confirmed by inspection of all 14 files. DEBT-005.                                                                                                                                           | Medium       |
| XC-5 | Certification profiles ([K.5](../blueprint/K-launch-certification.md)) exist only as prose. No harness configuration expresses Normal / High Latency / Packet Loss / Temporary Disconnect / Background-Foreground / Late Join / Leave-Rejoin / Host Disconnect / Member Disconnect. DEBT-004.                                                   | High         |
| XC-6 | `src/routes/api/debug/config.ts` is a debug surface reachable in a deployed build. Not a Constitution violation, but it should be flag-gated.                                                                                                                                                                                                   | Low          |

## 4. Additional validations required by the sprint brief

| Validation                                            | Result        | Evidence                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Room state remains server-authoritative               | **CONFIRMED** | `public.room_state` created in migration `20260802204057`, RLS `room_state_select_members` (members read) and `room_state_update_controller` (host/co-host update only), `GRANT SELECT, UPDATE … TO authenticated`, version trigger `trg_room_state_version` on every update. No client path writes authoritative position outside these policies. |
| WebRTC transports media and ephemeral signaling only  | **CONFIRMED** | Zero occurrences of `publishData`, `DataPacket`, `dataChannel`, `RTCPeer` in `src/`. LiveKit usage is confined to `src/infrastructure/voice/livekit-voice-adapter.ts` and carries audio tracks only.                                                                                                                                               |
| No Tier A capability lacks evidence                   | **VIOLATED**  | Four Tier A capability rows in [B](../blueprint/B-capability-matrix.md); zero implementing adapters; zero certification records; `provider-tier.ts` returns Tier A by name for 4 provider keys. See C.4/C.8 and GAP-001.                                                                                                                           |
| Provider capabilities recorded exactly as implemented | **DONE**      | [M0-Provider-Capability-Baseline.md](./M0-Provider-Capability-Baseline.md)                                                                                                                                                                                                                                                                         |
| No unsupported capability assumed                     | **DONE**      | All Unknowns retained as Unknown throughout this document set.                                                                                                                                                                                                                                                                                     |

## 5. Conformance scoring

Weighted by Constitution prominence (engines 1.0 each, Experience 1.0, cross-cutting governance 3.0), scored PASS = 1.0, PARTIAL = 0.6, NOT IMPLEMENTED-by-design = 1.0, FAIL = 0.0, cross-cutting = 0.2 (arch guard only).

| Bucket                                   | Weight   | Score   |
| ---------------------------------------- | -------- | ------- |
| 11 PARTIAL engines/subsystems            | 11.0     | 6.6     |
| 2 contract-only, conformant              | 2.0      | 2.0     |
| 2 FAIL engines (Sync, Provider)          | 2.0      | 0.0     |
| Cross-cutting governance & certification | 3.0      | 0.6     |
| **Total**                                | **18.0** | **9.2** |

**Overall Constitution Conformance: 51%.**

The number is dominated by two facts: the capability-tier violation, and the complete absence of certification machinery. Architectural _layering_ conformance, taken alone, would score far higher — `arch:check` passes and no vendor type escapes Infrastructure.

## 6. Recommendation

The implementation is **architecturally sound and evidentially unproven**. Layering, server authority, and transport discipline all hold. What does not hold is the Constitution's central promise: that no capability is claimed without a certification record.

Proceed to [M0-Build-Readiness.md](./M0-Build-Readiness.md) for the authorization decision.
