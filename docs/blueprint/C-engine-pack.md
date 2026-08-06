# C — Engine Architecture Pack

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0.

## C.0 What an engine is

An engine is an **organizing model inside the Domain layer**, not a new technical layer. The Foundation Spec layering is unchanged:

```text
Presentation → Feature → Domain → Repository → Infrastructure
```

Rules binding every engine:

1. Contracts are vendor-neutral. No Supabase, LiveKit, or LLM SDK type may appear.
2. Engines communicate through the internal event bus, never by reaching into another engine's state.
3. Dependencies are one-directional and declared. Cycles are a conformance failure.
4. Each engine declares the state classes it owns per [C3](./C3-state-management.md).
5. Each engine declares the product principles that bind it per [C5](./C5-product-principles.md).
6. Each engine owns certification rows in [K](./K-launch-certification.md).

There are **13 Domain Engines**. The [Experience Engine](./C2-experience-engine.md) is a cross-cutting presentation-support subsystem and is not counted among them.

## C.0.1 Spec format

Every engine below uses the identical format:

Responsibilities · Non-responsibilities · Current mapping · Public contracts · Published events · Consumed events · Dependencies · Lifecycle · Failure modes · Degraded-mode behaviour · Scalability hot paths · Owned state classes · Binding principles · Certification rows.

## C.0.2 Dependency direction

```text
Room ──► Timeline ──► Analytics
 │  └──► Presence ──► Voice
 ├──► Provider ──► Sync ──► Watch Party
 ├──► Notification ──► Community
 └──► Moderation
AI/Po ──► (read-only tool access to all, gated by Compliance)
Chat ──► Presence, Moderation
```

No arrow may be reversed. AI/Po never becomes a dependency of a domain engine.

---

## C.1 Room Engine

**Responsibilities.** Room creation, membership, roles, capacity (2–8), lifecycle transitions (`draft → open → ready → starting → active → paused → ended → archived`), invite issuance and resolution, join/leave, rejoin grace, room settings.

**Non-responsibilities.** Playback, position, drift, voice transport, presentation.

**Current mapping.** `src/domain/rooms/room-flow-service.ts`, `room-setup-service.ts`, `room-read-model.ts`, `room.types.ts`; `src/domain/services/room-service.ts`, `invitation-service.ts`; `src/features/invitations`, `src/features/waiting-room`.

**Public contracts.** `createRoom`, `openRoom`, `issueInvite`, `resolveInvite`, `join`, `leave`, `transition`, `endRoom`.

**Published events.** `room.created`, `room.opened`, `room.member_joined`, `room.member_left`, `room.transitioned`, `room.ended`, `invite.issued`, `invite.resolved`.

**Consumed events.** `presence.member_absent`, `moderation.member_removed`, `provider.capability_resolved`.

**Dependencies.** Timeline, Presence, Provider, Notification.

**Lifecycle.** init → bind repositories → active per room → degrade on transport loss (reads persist, writes queue) → teardown on archive.

**Failure modes.** Invite unresolvable; capacity race; concurrent transition; orphaned membership after crash.

**Degraded mode.** Reads served from persistent state; transitions blocked with a visible reason rather than guessed.

**Hot paths.** Invite resolution, membership fan-out on join, capacity check under concurrency.

**Owned state.** Persistent (room, membership, lifecycle); Offline (pending invite destination).

**Principles.** P4, P5, P2, P7, P9.

**Certification.** CERT-ROOM-01..04.

---

## C.2 Timeline Engine

**Responsibilities.** The append-only domain event stream: sequence allocation, ordering, persistence, replay, projection rebuild.

**Non-responsibilities.** Interpreting event semantics; deciding business outcomes.

**Current mapping.** `src/domain/events`, `src/infrastructure/events`, `supabase-event-store-repository.ts`.

**Public contracts.** `append`, `readSince`, `replay`, `allocateSequence`.

**Published events.** `timeline.appended`, `timeline.replay_complete`.

**Consumed events.** All engine events (as the sink).

**Dependencies.** None outward except repositories.

**Lifecycle.** init → bind store → active → degrade to buffered append → teardown with flush.

**Failure modes.** Sequence collision (server-side allocation prevents it), replay gap, unbounded stream growth.

**Degraded mode.** Client buffers appends and flushes in order on reconnect; duplicates rejected by sequence.

**Hot paths.** Append under concurrency; replay on reconnect.

**Owned state.** Persistent append-only.

**Principles.** P1, P4, P7, P9.

**Certification.** CERT-RT-01, CERT-RT-02.

---

## C.3 Watch Party Engine

**Responsibilities.** The session experience: stage progression (Invite → Waiting → Ready → Countdown → Watching), countdown scheduling, reactions, catch-up flow orchestration, HUD state assembly.

**Non-responsibilities.** Playback control (Sync), presence truth (Presence), rendering (Experience).

**Current mapping.** `src/features/watch-party`, `src/domain/countdown`, `src/domain/rooms/countdown-coordinator.ts`, `ready-coordinator.ts`, `playback-coordinator.ts`.

**Public contracts.** `advanceStage`, `scheduleCountdown`, `cancelCountdown`, `requestCatchUp`, `emitReaction`.

**Published events.** `party.stage_changed`, `party.countdown_scheduled`, `party.countdown_zero`, `party.reaction`.

**Consumed events.** `presence.readiness_changed`, `sync.drift_detected`, `room.transitioned`.

**Dependencies.** Room, Presence, Sync.

**Lifecycle.** init → bind room → active → degrade to manual coordination → teardown.

**Failure modes.** Countdown scheduled in the past; stage divergence between clients; catch-up offered where no position exists.

**Degraded mode.** Falls back to Tier C coordination with explicit guidance; never renders authoritative playback affordances (P1).

**Hot paths.** Countdown fan-out; reaction burst throughput.

**Owned state.** Persistent + realtime (countdown target instant).

**Principles.** P1, P2, P3, P4, P7.

**Certification.** CERT-WP-01..03.

---

## C.4 Sync Engine

**Responsibilities.** Clock synchronization, capability-tier-aware playback coordination, position tracking, drift measurement, buffer handling, tolerance policy.

**Non-responsibilities.** Deciding a capability's tier (Provider), UI (Experience), room authority (Room).

**Current mapping.** `src/domain/sync/clock-sync-engine.ts`, `drift-engine.ts`, `room-sync-coordinator.ts`, `server-time-source.ts`; `src/domain/playback`; `src/domain/services/sync-service.ts`, `playback-service.ts`.

**Public contracts.** `estimateOffset`, `reportPosition`, `measureDrift`, `issueControl` (Tier A only), `observe` (Tier B only).

**Published events.** `sync.position_reported`, `sync.drift_detected`, `sync.control_issued`, `sync.tier_degraded`.

**Consumed events.** `provider.capability_resolved`, `party.countdown_zero`, `presence.member_absent`.

**Dependencies.** Provider, Timeline.

**Lifecycle.** init → offset estimation → bind capability → active → degrade one tier → teardown.

**Failure modes.** Offset drift on suspended tabs; adapter unresponsive; observation loss; buffering storms.

**Degraded mode.** A→B→C, one step at a time, announced. Never emits a control call for a non-Tier-A capability, and never displays a synchronized state it has not verified (P1).

**Hot paths.** Position reporting cadence; drift computation per participant.

**Owned state.** Realtime (position, play state); Derived (drift); Session (clock offset).

**Principles.** P1, P2, P7, P8, P9.

**Certification.** CERT-SYNC-A-01..04, CERT-SYNC-B-01..02, CERT-SYNC-C-01..05, CERT-SYNC-04, CERT-SYNC-05.

---

## C.5 Voice Engine

**Responsibilities.** Voice session lifecycle, device selection and preferences, mute state, speaking indication, reconnect, permission handling.

**Non-responsibilities.** Transport vendor specifics (Infrastructure), spatial rendering (Experience).

**Current mapping.** `src/features/voice`, `src/domain/services/voice-service.ts`, `src/infrastructure/voice`.

**Public contracts.** `joinVoice`, `leaveVoice`, `setMuted`, `selectDevice`, `voiceState`.

**Published events.** `voice.joined`, `voice.left`, `voice.muted_changed`, `voice.degraded`, `voice.restored`.

**Consumed events.** `room.member_joined`, `room.ended`.

**Dependencies.** Presence, Room.

**Lifecycle.** init → permission → connect → active → degrade → teardown.

**Failure modes.** Permission denial; device removal; transport failure; echo.

**Degraded mode.** Room continues without voice; a one-tap retry is always visible (P6); failure never ends the room (P4).

**Hot paths.** Join burst when a countdown completes.

**Owned state.** Realtime (participant state); Persistent (device preferences).

**Principles.** P3, P4, P6, P7, P9.

**Certification.** CERT-VOICE-01..03.

---

## C.6 Chat Engine — contract-only

**Responsibilities.** Room text chat: send, deliver, order, retain, moderate.

**Status.** No implementation exists. Contract-only until a milestone activates it.

**Public contracts.** `sendMessage`, `readMessages`, `redactMessage`.

**Published events.** `chat.message_sent`, `chat.message_redacted`.

**Dependencies.** Presence, Moderation.

**Owned state.** Persistent + realtime.

**Principles.** P3, P7, P9.

**Certification.** Rows added when implementation begins.

---

## C.7 Presence Engine

**Responsibilities.** Who is here, who is ready, who dropped, heartbeat and absence detection, occupancy.

**Non-responsibilities.** Membership truth (Room), voice state (Voice).

**Current mapping.** `src/domain/rooms/presence-coordinator.ts`, `presence.types.ts`, `src/domain/services/presence-service.ts`, `realtime-channel-registry.ts`.

**Public contracts.** `announce`, `heartbeat`, `setReady`, `presenceSnapshot`.

**Published events.** `presence.member_present`, `presence.member_absent`, `presence.readiness_changed`.

**Consumed events.** `room.member_joined`, `room.member_left`.

**Dependencies.** Room.

**Lifecycle.** init → subscribe → active → degrade to last-known with staleness marker → teardown.

**Failure modes.** Ghost presence after crash; flapping on unstable networks; channel subscription races.

**Degraded mode.** Presence shown as stale with an explicit marker rather than as current.

**Hot paths.** Heartbeat fan-out; readiness rollup.

**Owned state.** Realtime.

**Principles.** P3, P4, P7, P9.

**Certification.** CERT-PRES-01..02.

---

## C.8 Provider Engine

**Responsibilities.** Capability catalogue, tier resolution against the `source · adapter · platform · version` tuple, disclosure text selection, deep-link construction and launch, provider session/connection status, fallback decisions.

**Non-responsibilities.** Playback control mechanics (Sync), any prohibited automation (P8).

**Current mapping.** `src/domain/providers/*` (`provider-catalog-service.ts`, `provider-tier.ts`, `deep-link-registry.ts`, `deep-link-service.ts`, `provider-launcher.ts`, `provider-launch-coordinator.ts`, `provider-session.ts`, `manual-sync-guidance.ts`, `content-reference.ts`), `src/features/providers`, `src/infrastructure/providers`.

**Public contracts.** `resolveCapability(tuple)`, `disclosureFor(capabilityId)`, `buildDeepLink`, `launch`, `sessionStatus`.

**Published events.** `provider.capability_resolved`, `provider.launch_requested`, `provider.launch_failed`, `provider.session_changed`.

**Consumed events.** `room.created`, `room.transitioned`.

**Dependencies.** Compliance (service), Room.

**Lifecycle.** init → load catalogue → resolve per room → active → degrade tier → teardown.

**Failure modes.** Unknown platform/version; missing certification record for a Tier A claim; unresolvable deep link.

**Degraded mode.** Missing or failing certification record forces the capability to Tier C at runtime, with disclosure. This is a hard rule, not a heuristic.

**Hot paths.** Catalogue resolution on home render; disclosure lookup.

**Owned state.** Persistent (provider session); Derived (tier resolution).

**Principles.** P1, P2, P7, P8, P9.

**Certification.** CERT-PROV-01..02, plus every Tier A row in [B](./B-capability-matrix.md).

---

## C.9 Notification Engine

**Responsibilities.** In-app notifications, badges, delivery, deduplication, read state, channel policy (ADR-007).

**Current mapping.** `src/features/notifications`, `notification-provider.tsx`, `src/domain/services/notification-service.ts`.

**Public contracts.** `notify`, `markRead`, `badgeCounts`, `subscribe`.

**Published events.** `notification.created`, `notification.read`.

**Consumed events.** `invite.issued`, `room.member_joined`, `community.friend_request`, `community.friend_accepted`.

**Dependencies.** Community, Room.

**Failure modes.** Duplicate delivery; stale badges; missed events while offline.

**Degraded mode.** Badges marked stale; reconciliation on reconnect.

**Hot paths.** Badge recomputation; fan-out on invite bursts.

**Owned state.** Persistent + realtime.

**Principles.** P5, P7, P9.

**Certification.** CERT-NOTIF-01.

---

## C.10 Community Engine

**Responsibilities.** Friends, requests, blocks (ADR-011), recurring groups, social graph reads.

**Current mapping.** `src/features/social`, `src/domain/social`, `src/infrastructure/social`.

**Public contracts.** `requestFriend`, `acceptFriend`, `block`, `unblock`, `listFriends`, `listGroups`.

**Published events.** `community.friend_request`, `community.friend_accepted`, `community.blocked`.

**Dependencies.** Moderation.

**Failure modes.** Block bypass via direct link; stale graph reads.

**Degraded mode.** Read-only graph with a staleness marker.

**Owned state.** Persistent.

**Principles.** P5, P8, P9.

**Certification.** CERT-COMM-01.

---

## C.11 AI / Po Engine

**Responsibilities.** Intent understanding, multi-step planning, clarification, tool invocation through the Tool Registry, privacy-scoped memory, model-agnostic adapters (ADR-001, ADR-008).

**Non-responsibilities.** Owning any domain state; being required for any user journey (Launch Envelope excludes a mandatory AI companion).

**Current mapping.** `src/features/po/brain/*` (`intent-engine.ts`, `planning-engine.ts`, `tool-catalog.ts`), `src/infrastructure/ai`.

**Public contracts.** `interpret`, `plan`, `execute`, `clarify`, `remember`, `forget`.

**Published events.** `po.intent_recognized`, `po.plan_created`, `po.action_executed`, `po.refused`.

**Consumed events.** Room, party, presence, provider events as read-only context.

**Dependencies.** Tool Registry, Compliance Service. Po is never a dependency of a domain engine.

**Failure modes.** Model unavailability; ambiguous intent; a tool exposing a prohibited action.

**Degraded mode.** Po disables itself with a visible notice; every journey remains completable without it.

**Owned state.** Persistent (sessions, plans, preference memory).

**Principles.** P2, P7, P8, P9.

**Certification.** CERT-PO-01.

---

## C.12 Analytics Engine

**Responsibilities.** Event schema, emission, consent scoping, no-PII enforcement, KPI derivation.

**Current mapping.** `src/domain/services/analytics-service.ts`.

**Public contracts.** `track`, `identifyScoped`, `flush`.

**Published events.** `analytics.emitted`.

**Consumed events.** All engine events.

**Failure modes.** PII leakage; schema drift; sampling loss.

**Degraded mode.** Local buffering with bounded retention; drop rather than block a user journey.

**Owned state.** Persistent append-only.

**Principles.** P8, P9.

**Certification.** CERT-ANL-01.

---

## C.13 Moderation Engine — contract-only

**Responsibilities.** Reports, enforcement actions, room-level safety controls, audit trail.

**Status.** No implementation exists. Contract-only until a milestone activates it. Block enforcement currently lives with Community and is certified there.

**Public contracts.** `report`, `enforce`, `appeal`, `auditTrail`.

**Published events.** `moderation.report_filed`, `moderation.member_removed`.

**Dependencies.** Community, Room.

**Owned state.** Persistent.

**Principles.** P7, P8, P9.

**Certification.** Rows added when implementation begins.

---

## C.14 Conformance

M0 verifies, for every engine: the module mapping is complete (no shipped module is orphaned), no dependency cycle exists, no vendor type appears in a contract, owned state classes match [C3](./C3-state-management.md), and every listed certification row exists in [K](./K-launch-certification.md). Failures block M0.
