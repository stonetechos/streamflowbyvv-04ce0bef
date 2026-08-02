# StreamFlow by Vedora Vision — Architecture Alignment Report v1.0

**Type:** Pre-development audit · **Status:** Complete · **Modifies:** nothing — all four approved documents are frozen and untouched.

Documents inspected: `docs/adr/ADR-001-po-agent.md` (158 lines), `docs/product/MVP-Functional-Specification-v1.0.md` (423 lines), `docs/database/Database-Specification-v1.0.md` (606 lines).

**Verified finding up front:** the Foundation Specification v1.0 does **not** exist as a file in this repository. A search of the whole project returns "Foundation" only as inbound *references* from the other three documents. Those three depend on it by section number (§2, §6, §7, §10, §14, §16, §17, §18, §19, §20) and declare it the tie-breaker for all conflicts. The understanding of it below is reconstructed from those references and from project memory, not read from source. This is the single largest readiness gap and is carried into §11 and §12.

---

## 1. Executive Understanding

**What StreamFlow is.** A watch-together coordination platform. Two to four people, each holding their own lawful subscription, watch the same title at the same moment on their own screens, in their own provider apps or tabs, while talking over voice. StreamFlow supplies the shared clock, the shared room, the shared voice channel, and Po — a natural-language agent that drives the product by intent. It is a *coordination layer over other people's players*, not a player.

**What StreamFlow is NOT.**
- Not a streaming service, CDN, media proxy, or transcoder. No media byte ever crosses StreamFlow infrastructure.
- Not a DRM, geo-fence, paywall, or subscription workaround. Anything requiring one is classified `Unavailable` and refused with an explanation.
- Not a credential broker. No provider passwords, cookies, session tokens, or DRM material are stored anywhere — the Database Spec states this both as a table-level prohibition on `provider_preferences` and as cross-cutting security rule 1.
- Not a scraper or an unofficial remote control. Provider control exists only where the provider itself publishes it (YouTube embed API) or where the media is the user's own file.
- Not a social network in v1: no friends graph, no public rooms, no communities, no discovery, no text chat.
- Not Lovable-, Supabase-, LiveKit-, or OpenAI-bound. Each is one swappable adapter behind an interface.

**Philosophy.** Four convictions run through every document:
1. *Legality is architecture, not policy.* Compliance is a service in the dependency graph with veto power, not a paragraph in the terms of service.
2. *Honesty over illusion.* Where control is impossible, the product says so and offers the lawful alternative (a countdown) as a first-class experience rather than pretending to sync.
3. *Portability is a first-order requirement.* One coupling point to auth (`profiles.auth_user_id`), one to the SFU (`voice_sessions.provider_key`), one to the LLM (the model capability interface). Vendor migration touches adapters, never domain.
4. *Additive growth.* New providers, tools, languages, and flags arrive as data or registry entries. Core modules are not edited to add capability.

---

## 2. Core Product Goal

**The primary experience.** A host creates a private room, invites up to three people, everyone lands in a Waiting Room, joins voice, marks Ready, agrees on a provider and title, and the host runs a countdown anchored to server time. At zero, everyone presses play in their own player. From then on the room shows a shared elapsed timer, anyone can raise "I'm behind"/"I'm ahead", and any drift is repaired by another short countdown. Voice runs throughout and never blocks the room.

**Why Manual Sync is the MVP, not a fallback.** Because it is the only mode that is simultaneously legal, reliable, and available today across the providers people actually use. Every non-YouTube provider begins at `Unverified`; none is legally validated for remote control at v1. If manual sync were a degraded fallback, the MVP's headline experience would depend on a capability that does not exist. Making countdown-driven coordination the first-class product inverts that dependency: the product works perfectly on day one, and true remote control (v2) becomes an *upgrade* to specific providers rather than a prerequisite for launch. The definition of done in MVP §16 is explicitly a manual-sync run.

**Why provider control is never assumed.** Assuming control would require scraping DOMs, injecting scripts, replaying session cookies, or driving DRM-protected players — every one of which is a prohibition. So the architecture treats controllability as a *per-capability, per-provider, evidence-backed claim*: `provider_capabilities` records a support level per capability (`play_pause`, `seek`, `deep_link`, `position_read`, `embed`, `local_playback`) with `verified_at`/`verified_by`, and `provider_compliance_rules` carries dated effective windows. Nothing is controllable until someone recorded that it is, and that record is auditable and revocable. Promotion out of `Unverified` requires a recorded legal validation.

---

## 3. System Architecture — layer responsibilities and prohibitions

**Presentation** (routes, components, Po surface: mic button, transcript, clarification prompt, plan preview). Renders state, captures input, handles accessibility and localization at the string-key level. *Never:* calls Supabase/LiveKit/an LLM SDK, contains business rules, holds sync arithmetic, embeds prompt text, hardcodes user-facing copy, or reads a table.

**Feature** (room, sync, voice, providers, settings, Po). Orchestrates use cases: composes domain services, owns view-model shape, owns local UI state and optimistic updates, subscribes to the event bus. *Never:* speaks to infrastructure, encodes vendor semantics, or duplicates domain rules.

**Po Core** — a Feature-layer citizen with a hard rule of its own: it reaches the world only through the Tool Registry, and every tool wraps a domain service. *Never:* touches repositories, the database, LiveKit, a provider plugin, or a vendor SDK; never carries tool-name literals or per-tool branching; never holds compliance rules. Removing Po entirely must leave StreamFlow fully usable — Po is never the only path to any feature.

**Domain** (RoomService, PlaybackService, SyncService, VoiceService, InvitationService, PresenceService, NotificationService, AnalyticsService, UserService, ProviderService, FeatureFlagService, LocalizationService, ComplianceService). Pure business rules, invariants, and event emission. *Never:* imports Supabase, LiveKit, an HTTP client, React, or any vendor type; never knows a table name or a storage engine.

**Repository** — interfaces owned by Domain, one per aggregate root (`profiles`, `rooms`, `providers`, `po_sessions`, `feature_flags`). Persistence contracts in domain vocabulary. *Never:* leaks a vendor row type, a PostgREST filter, or a query builder upward; never reaches across aggregate roots in a single read; never contains business rules.

**Infrastructure** — the only vendor-aware layer: Supabase client, Realtime, Storage, LiveKit adapter, LLM/STT/TTS adapters, IndexedDB local-first store, analytics sink. Implements repository interfaces, translates errors into domain error types. *Never:* makes a business decision, is imported by Presentation or Domain, or exposes a vendor type in a signature.

**Database** — the durable truth for rooms, sync state, events, and audit. Enforces referential integrity, uniqueness, ownership, and row-level access. *Never:* holds business orchestration in triggers and functions the domain layer should own, calls out to the app, stores a secret, or becomes the place features quietly coordinate.

The rule that makes this real: dependencies point one direction only, and each layer's forbidden-imports list is enforceable by lint. Coupling escapes get caught at the boundary, not at review.

---

## 4. Po — modules and how they interlock

**Role.** An intent-driven operating layer over StreamFlow. It converts imperfect natural language — spoken or typed — into a safe, ordered, compliance-checked sequence of real actions, and explains itself when it cannot act.

- **Speech Adapter / STT Adapter** — audio capture, press-to-talk, endpointing, barge-in; transcript plus confidence and language hints. Text input skips both and enters the identical pipeline. There is one intelligence, two input adapters.
- **Text Normalization** — deterministic, non-AI: whitespace, fillers, number/time expressions ("in five minutes"), name candidates, locale tags. Shrinks prompts and rescues weak transcripts.
- **Intent Engine** — utterance → intent type, entities, confidence, and *missing required slots*, enriched with conversation context and consented memory. Classifies and extracts; never decides how to act.
- **Planning Engine** — intent → ordered, dependency-aware tool plan with expected outcomes, each step tagged reversible or irreversible. Never fabricates a missing value; defers to the Conversation Manager instead.
- **Conversation Manager** — the state machine everything else reads: turn history, pending clarifications, unresolved slots, active plan, interruption, cancellation, multi-turn continuity.
- **Tool Registry** — the sole catalogue of what Po can do. Each entry declares name, description, input/output contracts, side-effect class, required permissions, compliance sensitivity, confirmation policy, namespace, and feature flag. What is not registered is not invocable — and the registry is what the model is told about.
- **Tool Executor** — validates arguments, checks authorization and rate limits, consults ComplianceService for provider-sensitive tools, requests confirmation where policy demands, executes through the domain service, records the outcome, emits domain events, and returns failures to the plan for repair rather than silent abandonment.
- **Memory Engine** — session memory (ephemeral) and preference memory (explicit, confirmed, opt-in, user-owned, viewable/editable/exportable/deletable). Nothing inferred; no credentials or tokens ever.
- **Prompt Library** — versioned assets (system, intent, planning, clarification, conversation, summarization) with metadata and changelogs, never inline in code, with the prompt version stamped on the turns that used it.
- **LLM Adapter** — a narrow model-capability interface (text, structured, tool-choice, streaming, embeddings). Adapters declare capabilities and Po degrades gracefully; stage-level routing and fallback chains are configuration. Keys stay server-side.
- **ComplianceService** — the Foundation authority, consulted and never re-implemented; Po cannot override a verdict.

**Working together:** input → normalize → intent → merge memory + conversation context → plan → clarify any missing slot (one question per turn, real options, cancel path) → compliance gate per provider-sensitive step → confirmation gate per irreversible step → execute step by step → observe and repair → summarize. One correlation id threads the utterance through intent, plan, tool executions, and domain events — which is exactly what `po_sessions` / `po_plans` / `po_clarifications` / `po_tool_executions` / `domain_events.correlation_id` persist.

---

## 5. Provider Architecture

**Provider SDK.** A plugin contract every provider implements identically: identity, capability declarations, deep-link construction, optional embed/control surface, and compliance metadata. First-party providers in v1 are catalog *rows* (`providers` + `provider_capabilities`), so onboarding a provider is data, not a migration.

**Capability Matrix.** Machine-readable, per-capability rather than per-provider. A provider is not "supported" as a whole; it is `supported` for `deep_link` and `unavailable` for `seek`. Support levels: **Supported** (StreamFlow may control), **Manual Sync** (countdown + deep link only), **Experimental** (flagged, opt-in, may break — no provider ships in this state in v1), **Unverified** (listed, coordination only, labelled), **Unavailable** (refused). v1 reality: YouTube and local files Supported; Netflix, Prime Video, Disney+/Hotstar, SonyLIV Manual Sync; everything else Unverified; anything requiring a workaround Unavailable.

**Compliance.** `provider_compliance_rules` holds dated, region-scoped verdicts (`allow`/`manual_only`/`warn`/`block`) with a rationale key. Every provider action — from a UI click or a Po tool — passes the ComplianceService first, and the verdict is shown inline to the user in plain language.

**Manual Sync.** Server-anchored countdown, shared elapsed timer, self-reported drift, one-tap re-sync, announced pause/resume/seek targets. `room_state.sync_mode` distinguishes `manual` from `controlled`, so the same room model serves both without a schema change when a provider is promoted.

**Deep Linking.** The only lawful hand-off: open the provider in the *user's own* session on their own device. No embedding of a protected player, no credential passing, no interception.

**Why providers are isolated.** Because they are the fastest-changing, highest-legal-risk, least-controllable part of the system. Isolation means a provider's status can flip overnight (`provider_status_history`) without touching room, sync, voice, or Po code; a provider can be disabled remotely by flag; a legal challenge is contained to rows; and the core product's correctness never depends on a third party's undocumented behaviour.

---

## 6. Database Understanding

**Philosophy.** A portable PostgreSQL schema that would survive being lifted out of Supabase intact. UUID surrogate keys with human-readable display codes (`ROM-000001`) that are never joined on; snake_case; UTC `timestamptz`; forward-only immutable migrations; enums modelled as application constants plus check constraints rather than native PG enum types precisely because native enums resist alteration and migration. Only `profiles.auth_user_id` touches the auth provider, so identity migration is one column. JSONB exists for forward compatibility with an explicit rule: anything filtered, sorted, or joined must be promoted to a real column.

**Entity ownership.** Five aggregate roots — `profiles`, `rooms`, `providers`, `po_sessions`, `feature_flags` — each with one repository and no cross-root joins. Every row has a documented owner, which is what makes RLS mechanical rather than inventive. The pivot for almost all room-scoped access is "does a `room_members` row exist for me in this room with state `joined`", which makes that index a *security* dependency, not just a performance one. Three ownership rules stand out: admin is a role in a separate authorization table checked by a security-definer function, never a column on `profiles`; Po data is private to its owner and unreadable by a room host; `blocked_users` is invisible to the blocked party.

**Auditing.** Six layers with distinct jobs — row audit (`created_at`/`updated_at`/`created_by`/`updated_by`), reversibility (`deleted_at` on user-authored rows), business history (`domain_events`: immutable, versioned, per-aggregate sequence, correlation/causation), security history (`audit_logs`: redacted before/after, hashed IP/UA, admin-only), a user-facing projection (`activity_timeline`, disposable and rebuildable from events), and compliance history (dated effective windows so "why was this blocked in March" is answerable).

**Future-proofing.** Extension is pushed into data, reserved enum values, and additive nullable FKs — never speculative tables. `rooms.visibility` already reserves `public`/`community`; `rooms.max_members` is data, so group watch is a policy change; billing, devices/push, friendships, and recommendations all attach to `profiles.id` by FK, which is why `profiles` is kept deliberately narrow and must never grow billing columns.

**How v1 avoids over-engineering.** An explicit guardrail: a v1 table must map to an MVP user journey that fails without it. Under it, friendships, communities, payments, devices, AI recommendations, room text chat, and normalized `po_plan_steps` are documented as reserved-with-a-reason rather than built. Where normalization would cost more than it returns today (`po_plans.steps` as JSONB), the promotion path is written down instead of pre-built.

---

## 7. User Journey Understanding — one complete run

**Sign Up.** Email + password (or magic link) → verification → display name, avatar, language, timezone → Home. A `profiles` row is created with code `USR-NNNNNN`; the five preference rows are created lazily on first write with domain-layer defaults. A pending invite captured before signup is remembered and resumed after verification. Events: `signed_up`.

**Create Room.** Host names the room (optional), visibility is private-only, optionally declares provider intent. A `rooms` row (`ROM-NNNNNN`, status `lobby`), a `room_members` row with role `host` and state `joined`, and the 1:1 `room_state` row are created in one transaction; a `RoomCreated` domain event is appended. Host lands in the Waiting Room with an invite ready.

**Invite Friend.** Host picks a recent partner or enters a handle/email. An `invites` row (`INV-NNNNNN`, `pending`, expiry) is written — link invites store only a hashed token. `blocked_users` is checked in both directions before the invite is allowed. Invitee gets in-app + toast + email; host watches live pending/accepted/declined status.

**Waiting Room.** Invitee opens the link, hits the auth wall with the invite preserved, membership is validated, and joins. `room_members` flips to `joined`, a `room_presence` heartbeat starts carrying latency and clock offset, and the mic permission prompt appears (skippable). Everyone marks Ready. Provider is chosen; the ComplianceService verdict and sync mode are shown inline; the agreed audio/subtitle tracks become a room note.

**Countdown.** Host sets a duration (default from preference). `room_state` moves to `counting_down` with `countdown_target_at` set and `version` incremented; every client renders the counter against *server* time corrected by its own measured `clock_offset_ms`, not local time. `sync_events` records `countdown_scheduled`. At zero: visible cue, audio ping, haptics where available, `countdown_fired`. A late joiner is not folded into a running countdown — they wait for the next one.

**Playback.** Each user presses play in their own provider tab or app. A `playback_sessions` row (`PLB-NNNNNN`, `sync_mode = manual`) opens; `playback_events` logs the start. The room displays a shared elapsed timer as the reference. "I'm behind"/"I'm ahead" writes `drift_measured`; a re-sync request runs another short countdown. Pause broadcasts a prompt to everyone; resume runs a countdown; a seek is announced as a target timestamp and then re-synced. Someone who misses a prompt shows as unconfirmed rather than silently drifting.

**Voice.** Joining is automatic if the preference allows, otherwise on demand. A `voice_sessions` row wraps the SFU with an opaque `external_session_ref` — the LiveKit token is minted server-side per join and never persisted. `voice_participants` tracks mute, deafen, and a three-level connection quality badge. If voice fails, the user is told exactly why (permission, device, service) and the room continues intact.

**Reconnect.** Connection loss shows a persistent banner and the offline shell. On restore: room state re-fetched, realtime and voice re-joined, clock offset re-measured, position re-anchored from `room_state.anchor_server_time` + `position_ms`, `clock_offset_updated` and `resync_applied` recorded. Every terminal case gets its own explicit screen — room closed while away, removed, session expired — never a silent dead room.

**Room Closed.** Host ends it, or the inactivity timeout fires with zero present participants. Everyone is notified and returned Home; `rooms.status` becomes `ended` with `ended_at`; the playback and voice sessions close with an end reason; `recent_partners` is updated from the `RoomEnded` event; `activity_timeline` gains a "watched together" entry. The room stays read-only in Recent for a limited period. If the host leaves permanently in v1 the room closes with notice — host migration is v1.1.

Throughout, Po can drive any of these steps by intent, and every Po-driven step lands in exactly the same domain services with the same compliance and confirmation gates.

---

## 8. Compliance Understanding

**What StreamFlow will never do.** Circumvent DRM. Bypass a subscription, paywall, or regional restriction. Proxy, cache, re-host, or transcode copyrighted media. Scrape a provider or drive it through an unpublished interface. Store, share, or relay provider credentials, cookies, session tokens, or DRM material. Present an unverified provider as controllable. Let any surface — UI or Po — reach a provider without a verdict.

**How ComplianceService protects the architecture.** It is a single domain authority with veto power, sitting in front of every provider-sensitive path. The Tool Executor must call it before a provider-sensitive tool; Po holds no rules of its own and cannot override it; the Presentation layer displays verdicts but never computes them. Its rules are data with dated, region-scoped effective windows, so verdicts are explainable *as of a date* and revocable without a deploy. Denials are logged with the originating utterance's correlation id, and refusals are phrased as human explanations with a lawful alternative offered.

**Why this matters.** Legal exposure here is existential rather than incremental — a single scraping path or credential relay anywhere in the codebase compromises the whole product. Centralizing the verdict means the prohibition is enforced by the dependency graph rather than by developer discipline: there is exactly one place to audit, one place to change when a provider's status flips, and no second path a well-meaning feature can take. It also protects users, who are the ones holding the subscriptions.

---

## 9. Build Philosophy

**How implementation should happen.** Strictly bottom-up per module and vertically per feature: Foundation-defined contracts and events first, then infrastructure adapters, repositories, domain services, features, and finally presentation. One module at a time, reviewed and closed before the next opens — the Foundation's mandated Architecture → Review → Freeze → Build One Module cycle exists specifically to stop scope creep from entering through implementation.

**How modules should be built.** Each module ships with its contract, its domain events, its error taxonomy, its localization keys, its feature flag, its accessibility behaviour, and its analytics events — not as follow-ups. No module reaches past its layer. Every user-facing string is a key from the first commit; retrofitting localization is a documented non-option. Every provider-touching path calls ComplianceService.

**How documents should be respected.** The four approved documents are the specification of record: the Database Spec governs every migration, ADR-001 governs Po, the MVP Spec governs scope, and the Foundation Spec wins every conflict. Nothing ships that is not traceable to a section.

**How architecture changes should be handled.** Only through a new numbered ADR in `docs/adr/` that names the affected sections and tables. Approved documents are never edited in place; they are extended or superseded by record. Schema changes require an ADR and a forward-only migration traceable to a Database Spec section.

**Why implementation must not invent features.** Because in this product an invented feature is usually an invented *capability*, and invented capabilities here are legal exposure — a helpful "we could just read the player position" is precisely the prohibition. Beyond legality: the MVP's definition of done is one complete session, and every unplanned addition dilutes it; unspecified behaviour has no localization keys, no accessibility pass, no analytics, no RLS decision, and no compliance verdict, so it ships as a hole in four systems at once.

---

## 10. Risks

**Technical.** Clock synchronization accuracy across devices and networks — the entire countdown promise rests on `clock_offset_ms` estimation quality, and no target tolerance is stated anywhere. Manual sync is only as good as human reaction time at the "play now" cue. Realtime fan-out and reconnect storms. LiveKit behaviour on mobile networks and inside Capacitor webviews. Microphone permissions in PWAs across browsers. YouTube embed API terms and behaviour changes. Po latency from voice to action, and per-turn model cost. `room_presence` write churn in PostgreSQL. Local-first IndexedDB reconciliation conflicts on reconnect. Deep links opening reliably on mobile.

**Legal.** Provider terms of service may prohibit even coordination or deep-link framing. Regional variation (India/EU/US) in what is permissible. The `Unverified` label carries reputational and legal weight while providers are listed. Email/PII handling under GDPR and India's DPDP, including the erasure path. Voice audio is never recorded — this must remain provably true. Trademark and logo usage for provider names in the matrix.

**Architectural assumptions.** That the Foundation Spec exists and says what the other three documents cite. That "Supported" YouTube control genuinely coexists with manual-sync UX in one room model. That a room never needs two concurrent providers. That the host is always the sync authority (no host migration in v1). That `po_plans.steps` as JSONB is sufficient for v1. That check-constraint enums stay in sync with application constants without drift. That `activity_timeline` and `recent_partners` are always rebuildable from `domain_events`.

**Must be validated before implementation.** Achievable clock-sync accuracy and the acceptable drift tolerance in milliseconds. Provider ToS review for each of the six named providers. YouTube API terms for synchronized group playback. Whether an email provider is in scope for v1 email invites and verification. LiveKit cost model and region. Model provider selection, latency budget, and cost ceiling for Po. The two launch locales. Inactivity timeout, invite expiry, and countdown default durations. Whether "email invite" implies an addressable non-user, which the current `invites` model does not represent.

---

## 11. Internal Contradictions, Ambiguities, Missing Definitions, Assumptions

### Contradictions

1. **`room_status` vs. the documented room lifecycle.** The Database Spec enumerates `lobby, active, paused, ended, abandoned`; the MVP Spec's lifecycle names `Created → Waiting Room → … → Closed`. "Waiting Room" ≠ `lobby` and "Closed" ≠ `ended` are unmapped, and the MVP mentions inactivity auto-close without saying whether that is `ended` or `abandoned`.
2. **Provider preferences duplicated across owners.** MVP §10 puts "region" and "default provider" in Provider Preferences; the Database Spec's `provider_preferences` has only `is_favorite`, `is_hidden`, `last_used_at`, with no region or default column, and no other table holds them.
3. **Voice settings have no home.** MVP §10 Voice page specifies default microphone, default speaker, join-muted, and push-to-talk. No preference table in the Database Spec has these columns; `appearance_preferences` and `privacy_preferences.voice_auto_join` cover only part.
4. **Room capacity default.** Database Spec sets `rooms.max_members` default 4 with a check between 2 and 8 ("v1 policy enforces 4"); MVP states four flatly and lists larger rooms as v2 — the 2–8 range permits a state the product forbids.
5. **Text size / font scale placement.** MVP puts "text size" under Appearance; the Database Spec puts `font_scale` under `accessibility_preferences`.
6. **Email invites to non-users.** MVP §3.7 allows inviting by email; `invites.invitee_profile_id` requires an existing profile for direct invites and there is no email column, so an email invite to a stranger has no representation other than a link invite.
7. **Notification channels.** MVP §9 lists in-app, toast, email, audio cue, and persistent banner; the DB enum `notification_channel` is `in_app, push, email` — toast, audio cue, and banner are presentation modes with no model, and `push` exists in the enum while MVP declares push notifications future.
8. **Po session status vs. clarification.** `po_session_status` includes `awaiting_clarification` while `po_clarifications.status` also has `pending`; two sources of truth for the same condition, with no stated precedence.
9. **`room_state.playback_status` vs. `rooms.status`.** Both carry `paused`; which one the UI reads for a paused room is unspecified.

### Ambiguities

10. Drift tolerance is referenced repeatedly ("within the drift tolerance", "drift beyond tolerance") but never quantified.
11. Countdown default duration, invite expiry, join-code expiry, inactivity timeout, and rate-limit thresholds are all referenced without values.
12. "Co-host" exists as a `room_role` and holds write rights over `room_state` in the security matrix, but no MVP journey creates one.
13. Whether YouTube's true synchronized playback and manual-sync coordination can be active in the same room, and what `room_state.sync_mode` is when the provider is Supported but a participant is on a different player.
14. `analytics_events.anonymous_id` lifetime and scope (device, session, install) is undefined.
15. "Recent for a limited period" for closed rooms has no duration.
16. "Two launch locales (English plus one)" — the second locale is never named, which blocks RTL and pluralization decisions.
17. The `blocked_users` enforcement points are listed, but the behaviour when a block occurs *during* an active shared room is unspecified.
18. Guest room preview scope — what an unauthenticated visitor may see of a private room before the auth wall.

### Missing definitions

19. **The Foundation Specification v1.0 file itself.** Verified absent from the repository while being cited by section number as the tie-breaker for all conflicts.
20. The admin/moderator authorization table is required by Database Spec security rule 6 ("a separate authorization table … checked via a security-definer function") but is not in the entity catalog; MVP reserves the roles.
21. The domain event catalog — event names, payload shapes, and versions — is referenced by all three documents but enumerated nowhere.
22. The Tool Registry's concrete input/output contracts (ADR-001 defers them to `api/po-tool-registry.md`, which does not exist).
23. Error taxonomy codes, and the mapping from `notifications.title_key`/`body_key` and `error_message_key` to actual key namespaces.
24. Clock synchronization algorithm and how `clock_offset_ms` is computed and refreshed.
25. Storage buckets and rules for avatars (upload limits appear in a journey; no storage design exists).
26. Rate-limit policy surface (creation limits and invite limits are referenced as errors with no defined home).
27. Email delivery provider and template ownership for verification, reset, and invites.
28. The local-first IndexedDB cache contents and the reconciliation rules on reconnect.

### Assumptions in the documents

29. That the host's client is reliable enough to be the sync authority, with no host migration in v1.
30. That users will comply with the countdown cue within tolerance — a human, not technical, guarantee.
31. That check-constraint enums will be kept in lockstep with application constants by review alone.
32. That `activity_timeline` and `recent_partners` remain fully rebuildable from `domain_events`, which requires event retention to exceed projection lifetime (24 months is stated for events; nothing is stated for projections).
33. That Supabase Realtime is sufficient for countdown-grade timing fan-out.
34. That deep links reliably open the provider's native app on mobile.

---

## 12. Readiness Assessment

**Score: 72 / 100.**

| Dimension | Score | Note |
|---|---|---|
| Product clarity | 17/20 | Journeys, tiers, and definition of done are unusually complete; a handful of undefined constants |
| Architecture clarity | 14/20 | Layering and prohibitions are crisp — but the governing document is not in the repository |
| Data model | 17/20 | Production-grade and portable; a few enum/journey mismatches and two orphaned preference sets |
| Po specification | 14/15 | ADR-001 is thorough; tool contracts deferred to a file that doesn't exist |
| Compliance | 14/15 | Strongest area; enforcement point, data model, and product behaviour all agree |
| Operational readiness | 6/10 | No numbers: drift tolerance, timeouts, expiries, rate limits, locales, latency budgets |

**Justification.** The conceptual work is genuinely done — the product knows what it is, the legal posture is designed in rather than bolted on, the layering is enforceable, and the schema is portable and honest about what it defers. What is missing is not thinking but *artifacts and constants*: the Foundation document, the event catalog, the tool contracts, and roughly a dozen numeric thresholds that implementation cannot invent without silently making product decisions. The listed contradictions are all small and mechanically resolvable, but resolving them in code rather than in documents would fork the specification on day one.

### Required before Build Mode

1. Commit the Foundation Specification v1.0 to `docs/` — nothing else can be conflict-resolved without it.
2. A reconciliation ADR resolving contradictions 1–9 (room status mapping, preference table coverage for voice/region/default provider, capacity range, text-size ownership, email-invite representation, notification channels vs. presentation modes, Po clarification precedence).
3. The domain event catalog: names, payload schemas, versions, and per-aggregate sequencing rules.
4. The Po Tool Registry contract document (`api/po-tool-registry.md`) and the Prompt Library index.
5. A constants annex: drift tolerance, countdown default and bounds, invite/join-code expiry, inactivity timeout, rate limits, retention for projections, Po latency and cost ceilings.
6. The authorization/roles table added to the Database Spec by ADR (currently required by a security rule but absent from the catalog).
7. Provider ToS and regional legal review for the six named providers, recorded as the first `provider_compliance_rules` and `provider_capabilities` dataset.
8. Naming of the second launch locale, and the string-key namespace convention.
9. Storage design for avatars, and the email delivery decision for verification, reset, and invites.
10. A clock-synchronization design note (algorithm, refresh cadence, accuracy target) — the single technical assumption the headline experience depends on.

---

## Closing question — what a replacement architect would still be missing

Handed only this repository, a senior architect who had never seen StreamFlow would understand the product, the legal posture, and the schema — and would still be unable to build it as intended, because five things live only in the authoring context:

1. **The Foundation Specification itself.** Every other document defers to sections of a file that isn't here. They would be forced to reconstruct §2, §6, §7, §10, §14, §16, §17, §18, §19, §20 by inference, and their reconstruction would differ from this one.
2. **The event contracts.** The whole architecture is event-driven, and the events are named but never specified — so their `domain_events` payloads, and therefore every projection and every replay, would be invented.
3. **Every threshold that defines "working".** Drift tolerance decides whether the product succeeds or fails; it is not written down. Nor are timeouts, expiries, countdown bounds, or rate limits.
4. **The rationale behind the deliberate omissions.** The documents say host migration, friends, and text chat are v1.1 — they do not say the omissions are load-bearing for a four-person, host-authoritative, manual-sync room. A newcomer would read them as backlog and might helpfully "improve" the room model, breaking the MVP thesis.
5. **The intended feel.** Nothing describes the visual identity, the tone of Po's voice, or the emotional target of the countdown moment — the product's one genuinely delightful beat. That has never been specified in any of the four documents.

**Recommended next step:** freeze the Foundation Specification into the repository and issue the reconciliation ADR before any module is opened.
