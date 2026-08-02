# StreamFlow by Vedora Vision — Specification Reconciliation Report v1.0

**Status:** Planning artifact. Documentation only.
**Role:** Principal Software Architect / Specification Auditor.
**Inputs (read-only):** Foundation Specification v1.0 (cited, absent), ADR-001 — Po Intent-Driven AI Agent, MVP Functional Specification v1.0, Database Specification v1.0, Architecture Alignment Report v1.0.
**Scope:** Adjudicate every item raised in the Architecture Alignment Report v1.0 (items 1–34) and close the planning phase.
**Non-scope:** No code, no SQL, no redesign, no new features, no edits to approved documents.

**Legend — classification:** TC = True contradiction · AA = Acceptable ambiguity · MS = Missing specification · FP = False positive.
**Legend — impact:** ARCH = architecture · DB = database · API = API/contract · UI = user interface · IMPL = implementation only.

---

## 1. Adjudication — Contradictions (Report items 1–9)

### 1. `room_status` vs. documented room lifecycle
**Classification:** TC.
**Resolution:** Keep the Database Spec's persisted enum (`lobby, active, paused, ended, abandoned`) as the single normative state machine and declare the MVP's lifecycle names as presentation labels mapped 1:1 onto it: Waiting Room → `lobby`, Watching → `active`, Paused → `paused`, Closed by host → `ended`, Auto-closed on inactivity with zero present participants → `abandoned`. Publish the mapping table plus the legal transitions.
**Reasoning:** Two vocabularies for one machine is the classic source of divergent client logic. Persisted state must win because it is what RLS, projections, and events read; product language must remain free to be human. Assigning inactivity auto-close to `abandoned` preserves the analytic distinction between an intentional end and an expired room, which is already why two terminal values exist.
**Documents to update:** MVP Functional Spec (label→state mapping appendix), Database Spec (transition table). Both via ADR.
**Impact:** ARCH, DB, UI, IMPL.

### 2. Provider preferences duplicated across owners
**Classification:** TC.
**Resolution:** One owner per field. `provider_preferences` stays per-user-per-provider (`is_favorite`, `is_hidden`, `last_used_at`). "Region" belongs to the user's localization/compliance context, not to a provider row, and must resolve from the existing localization preference; "default provider" is a single scalar per user and belongs with the user's provider-scoped preferences as one nullable reference, not as a flag repeated across rows.
**Reasoning:** A per-provider table cannot express a singleton choice without an integrity risk (two defaults). Region drives compliance verdicts globally, so duplicating it per provider would let one row contradict another and make ComplianceService non-deterministic.
**Documents to update:** Database Spec (field ownership), MVP Spec §10 (settings page reads from those owners).
**Impact:** DB, UI, IMPL.

### 3. Voice settings have no home
**Classification:** MS.
**Resolution:** Define one owner for voice-device and voice-behaviour settings. Behavioural settings that must follow the user across devices (join-muted, push-to-talk, auto-join) belong in a user preference row; device selections (microphone, speaker) are device-local and belong in local storage, not the database.
**Reasoning:** Device identifiers are not portable between devices and would produce invalid state on every new device; behaviour is portable and must be. Splitting on portability is the only rule that survives Capacitor and multi-device use.
**Documents to update:** Database Spec (preference ownership), MVP Spec §10 (which settings sync and which do not).
**Impact:** DB, UI, IMPL.

### 4. Room capacity default
**Classification:** TC (narrow).
**Resolution:** Keep the column and the 2–8 check as the schema's future envelope, but state explicitly that v1 enforces a maximum of 4 in the domain layer and that any value above 4 is unreachable in v1 by policy, not by schema.
**Reasoning:** Widening the check later is a migration; narrowing policy is a constant. Schema envelope plus domain policy is the cheaper and already-intended split — the contradiction is only that the intent is unstated as a rule.
**Documents to update:** MVP Spec (state the domain-enforced cap), Database Spec (annotate the check as an envelope).
**Impact:** DB, IMPL.

### 5. Text size / font scale placement
**Classification:** FP (naming only).
**Resolution:** Keep `font_scale` under accessibility as the storage owner; the MVP's Appearance page may surface the same control. Note it as a UI placement, not a second field.
**Reasoning:** Storage ownership and navigation placement are different concerns; no data conflict exists.
**Documents to update:** MVP Spec (footnote that the control reads the accessibility field).
**Impact:** UI.

### 6. Email invites to non-users
**Classification:** TC.
**Resolution:** For v1, an email invite is a link invite delivered by email — the invite row remains hashed-token based with no `invitee_profile_id`, and the recipient becomes a member only after signup and acceptance. Addressable non-user invites (an email column with dedupe on later signup) are deferred.
**Reasoning:** This resolves the conflict with zero schema change and preserves the auth-wall journey already specified. Modelling strangers as rows introduces PII retention, GDPR/DPDP erasure, and abuse surface that the MVP has not scoped.
**Documents to update:** MVP Spec §3.7 (email invite = emailed link), Database Spec (note the deferral).
**Impact:** DB, UI, IMPL.

### 7. Notification channels
**Classification:** TC in part, FP in part.
**Resolution:** FP for toast, audio cue, and persistent banner — these are presentation modes of the `in_app` channel and must be documented as such, not added to the enum. TC for `push`: keep the reserved enum value but state that no v1 code path emits it and no device/token table exists in v1.
**Reasoning:** Channels model delivery transport; rendering style is a UI decision that must not enter the data model. A reserved enum value with a written "not emitted in v1" rule is cheaper than a future migration.
**Documents to update:** MVP Spec §9 (channel vs. presentation mode), Database Spec (annotate `push` as reserved).
**Impact:** DB, UI, IMPL.

### 8. Po session status vs. clarification status
**Classification:** TC.
**Resolution:** `po_clarifications` is the source of truth for an outstanding question; `po_sessions.awaiting_clarification` is a derived convenience state that must be maintained as a strict function of "an open clarification exists". Document the precedence: on any disagreement, the clarification rows win and the session status is repaired.
**Reasoning:** Denormalized status is worth keeping for query cost, but only with a written derivation rule. Without stated precedence, two subsystems can legitimately disagree and Po stalls.
**Documents to update:** ADR-001 (precedence rule), Database Spec (mark the session field derived).
**Impact:** ARCH, DB, IMPL.

### 9. `room_state.playback_status` vs. `rooms.status`
**Classification:** TC.
**Resolution:** `rooms.status` is the room lifecycle (is this room open at all); `room_state.playback_status` is the session-level playback condition. The watching UI reads `room_state`; navigation, listing, and RLS read `rooms.status`. Remove ambiguity by stating that `rooms.status = paused` is not used to represent a paused video in v1.
**Reasoning:** Overloading lifecycle with playback makes every list query and policy depend on transient playback churn — high write volume on a security-relevant column. Separating read owners is the minimal fix.
**Documents to update:** Database Spec (read-owner rule), MVP Spec (UI reads).
**Impact:** ARCH, DB, UI.

---

## 2. Adjudication — Ambiguities (Report items 10–18)

### 10. Drift tolerance unquantified
**Classification:** MS. **Resolution:** Publish a numeric tolerance table (acceptable / warn / re-sync-required bands in milliseconds) as a Foundation constant, validated by a measurement spike before the sync module is built. **Reasoning:** The countdown promise, the "I'm behind" affordance, and the re-sync trigger are all defined relative to a number that does not exist; without it the module has no definition of done. **Documents:** Foundation Spec (constants), MVP Spec (user-visible bands). **Impact:** ARCH, UI, IMPL.

### 11. Countdown default, invite expiry, join-code expiry, inactivity timeout, rate limits
**Classification:** MS. **Resolution:** One "System Constants" table in the Foundation Spec, each value named, defaulted, and marked configurable-or-fixed. **Reasoning:** These are cross-cutting values referenced by DB defaults, domain services, and UI copy; scattering them guarantees drift. **Documents:** Foundation Spec (owner), Database Spec (defaults reference it). **Impact:** ARCH, DB, UI, IMPL.

### 12. Co-host role with no journey
**Classification:** AA. **Resolution:** Keep the reserved role and state that v1 never creates one; permissions remain documented for v1.1. **Reasoning:** A reserved enum value with no creation path is inert and costs nothing; removing it would force a later migration. **Documents:** MVP Spec (explicit non-goal). **Impact:** IMPL.

### 13. YouTube true sync vs. manual sync in one room
**Classification:** MS (blocking). **Resolution:** Declare one sync mode per room, set from the room's selected provider, stored in `room_state.sync_mode`, and immutable while a playback session is open; a participant who cannot use the supported path is downgraded to the room's mode, never the room to theirs. **Reasoning:** Two concurrent authorities over one timeline is unresolvable at runtime; the room model already assumes a single provider intent. **Documents:** MVP Spec (provider selection rules), Database Spec (`sync_mode` semantics), Foundation Spec (sync authority). **Impact:** ARCH, DB, UI, IMPL.

### 14. `analytics_events.anonymous_id` lifetime
**Classification:** MS (non-blocking). **Resolution:** Define it as per-install, regenerated on data clear and on explicit opt-out, never joined to `profiles` after identification. **Reasoning:** Needed for privacy claims and for the DPDP/GDPR erasure path, but it does not gate any other module. **Documents:** Foundation Spec (analytics), Database Spec (column note). **Impact:** DB, IMPL.

### 15. "Recent for a limited period"
**Classification:** MS (non-blocking). **Resolution:** Fold into the System Constants table as a retention value. **Impact:** UI, IMPL.

### 16. Second launch locale unnamed
**Classification:** MS. **Resolution:** Name the locale before the localization module is built, because RTL support and plural rules are structural, not cosmetic. Until named, build locale-agnostic with RTL-capable layout primitives. **Documents:** MVP Spec, Foundation Spec (localization). **Impact:** UI, IMPL.

### 17. Block during an active shared room
**Classification:** MS (blocking, small). **Resolution:** Specify one deterministic outcome — the block takes effect immediately for future invites and room joins, and the in-progress room continues to its natural end unless the blocking user leaves. **Reasoning:** Any rule is acceptable; no rule means two clients diverge on a safety-relevant path. **Documents:** MVP Spec (safety), Database Spec (enforcement points). **Impact:** UI, IMPL.

### 18. Guest room preview scope
**Classification:** MS (blocking, small). **Resolution:** Define exactly what an unauthenticated visitor holding an invite link may see before the auth wall — recommended minimum: room display name and inviter display name only, no member list, no provider, no state. **Reasoning:** This is an RLS-visible decision and cannot be deferred to implementation without leaking private room data. **Documents:** Database Spec (RLS matrix), MVP Spec (journey). **Impact:** DB, UI.

---

## 3. Adjudication — Missing definitions (Report items 19–28)

| # | Item | Class | Recommended resolution | Docs to update | Impact |
|---|---|---|---|---|---|
| 19 | Foundation Specification v1.0 file absent | MS — **critical** | Commit the Foundation Spec as written and cited. Every other document names it as the tie-breaker; the reconciliations above are unenforceable without it. | Foundation Spec (create as record) | ARCH, DB, API, UI, IMPL |
| 20 | Admin/moderator authorization table | MS | Add the separate roles table plus security-definer role check to the entity catalog, per Database Spec security rule 6. Roles must never live on `profiles`. | Database Spec | ARCH, DB |
| 21 | Domain event catalog | MS | Publish the event catalog: name, version, payload shape, emitting service, consumers. This is the contract the event bus, projections, and audit all depend on. | Foundation Spec (+ `docs/api/`) | ARCH, API, DB, IMPL |
| 22 | Tool Registry contracts | MS | Publish `api/po-tool-registry.md` with per-tool input/output/error/compliance-gate definitions, as ADR-001 already promises. | ADR-001 companion doc | ARCH, API, IMPL |
| 23 | Error taxonomy and localization key namespaces | MS | Define error codes and the key namespace grammar that `title_key`, `body_key`, and `error_message_key` must conform to. | Foundation Spec | API, UI, IMPL |
| 24 | Clock sync algorithm and `clock_offset_ms` | MS — blocking | Specify the offset estimation method, sample count, refresh cadence, and rejection rules. The countdown correctness rests entirely on this. | Foundation Spec (sync) | ARCH, IMPL |
| 25 | Avatar storage buckets and rules | MS | Define bucket, path convention, size/type limits, and access policy. | Database Spec / Foundation Spec (storage) | DB, IMPL |
| 26 | Rate-limit policy surface | MS | Name the owning layer and the limits; errors already exist without a home. | Foundation Spec (+ System Constants) | ARCH, API, IMPL |
| 27 | Email delivery provider and templates | MS | Decide whether transactional email is in v1 scope; if yes, name the provider and template owner, if no, restrict invites to shareable links. | MVP Spec | ARCH, UI, IMPL |
| 28 | IndexedDB cache contents and reconciliation rules | MS | Enumerate cached aggregates, TTLs, and the server-wins/merge rules on reconnect. | Foundation Spec (local-first) | ARCH, IMPL |

---

## 4. Adjudication — Assumptions (Report items 29–34)

| # | Assumption | Class | Verdict and reasoning | Docs | Impact |
|---|---|---|---|---|---|
| 29 | Host client is the sync authority; no host migration | AA | Accept for v1 and record it as an explicit, dated limitation with the failure behaviour already specified (host leaves → room closes with notice). Migration is v1.1. | MVP Spec | ARCH |
| 30 | Users comply with the countdown cue | AA | Accept — it is the product's honest premise. Record that the technical guarantee is cue delivery accuracy, not playback alignment. | MVP Spec | UI |
| 31 | Check-constraint enums stay in lockstep by review | AA (with mitigation) | Accept the design, but require a single source-of-truth constants module and a review checklist item on every enum-touching migration. | Foundation Spec (standards) | IMPL |
| 32 | Projections rebuildable from `domain_events` | TC (latent) | Not currently guaranteed: events retain 24 months, projections have no stated lifetime. Rule to adopt — projection retention must never exceed event retention. | Database Spec | DB |
| 33 | Supabase Realtime sufficient for countdown timing | AA — **validate** | Accept provisionally, contingent on a measurement spike against the item-10 tolerance table before the sync module is frozen. | Foundation Spec (risks) | ARCH |
| 34 | Deep links reliably open native provider apps | AA | Accept with a documented fallback: web hand-off when the native app does not open. Reliability is outside StreamFlow's control and must not be promised. | MVP Spec | UI, IMPL |

---

## A. Blocking Issues

Must be resolved before Build Mode opens.

1. **Foundation Specification v1.0 is absent** (item 19) — the cited tie-breaker for every conflict resolved in this report.
2. **Domain event catalog undefined** (item 21) — the event bus, audit, and every projection depend on it; the first module cannot ship its events without it.
3. **Drift tolerance unquantified** (item 10) — no definition of done for sync.
4. **Clock synchronization algorithm undefined** (item 24) — the countdown, the core promise, has no specified mechanism.
5. **System constants unset** (item 11) — countdown default, invite/join-code expiry, inactivity timeout, rate limits; these become DB defaults and UI copy.
6. **Room lifecycle mapping unresolved** (item 1) — state machine ambiguity blocks rooms, RLS, and projections.
7. **Sync-mode-per-room rule undefined** (item 13) — two concurrent sync authorities is unresolvable at runtime.
8. **Voice settings have no owner** (item 3) — blocks the preferences and voice modules.
9. **Provider preference ownership conflict** (item 2) — region feeds ComplianceService and must be single-sourced.
10. **Email invite representation** (item 6) — invites cannot be built against two incompatible models.
11. **Admin/moderator authorization table missing** (item 20) — a security rule with no entity; privilege checks cannot be built correctly without it.
12. **Guest preview scope undefined** (item 18) — an unresolved RLS decision with private-data exposure risk.
13. **Tool Registry contracts missing** (item 22) — Po cannot be built against an unwritten registry.
14. **`rooms.status` vs. `room_state.playback_status` read ownership** (item 9) — affects every room query and policy.
15. **Error taxonomy and localization key namespaces** (item 23) — every module must ship keys from its first commit; retrofitting is a documented non-option.
16. **Projection vs. event retention rule** (item 32) — a data-loss class defect if set wrong at the start.
17. **Block-during-active-room behaviour** (item 17) — safety-relevant and cheap to decide.

---

## B. Non-blocking Issues

Safely deferred, with the deferral recorded.

1. Co-host role remains reserved and uncreated in v1 (item 12).
2. `push` notification channel remains a reserved enum value with no v1 emitter (item 7).
3. Font-scale surfacing under Appearance — UI placement note only (item 5).
4. Room capacity envelope 2–8 retained in schema with a domain-enforced cap of 4 (item 4).
5. `analytics_events.anonymous_id` lifetime — define before analytics ships, not before Build Mode (item 14).
6. Closed-room "Recent" retention window — a constant, fillable at any time (item 15).
7. Avatar storage design — needed before the profile module, not before Build Mode (item 25).
8. Email provider selection — deferrable if v1 invites are shareable links (items 6, 27).
9. IndexedDB cache contents and reconciliation rules — needed before the local-first module (item 28).
10. Rate-limit values — needed before the surfaces that enforce them (item 26).
11. Second launch locale naming — needed before the localization module; build RTL-capable meanwhile (item 16).
12. Host migration, addressable non-user invites, normalized Po plan steps — all v1.1+ by record (items 29, 6).
13. Assumptions 30, 31, 33, 34 — accepted with documented mitigations and one measurement spike (item 33).

---

## C. Recommended Specification Updates

A numbered checklist of documentation changes. No document is rewritten here; each item below is an amendment to be authored and approved, and every change to an approved document must arrive as a numbered ADR in `docs/adr/`.

1. **Commit Foundation Specification v1.0** to the repository exactly as cited by the other documents.
2. **Add a System Constants table** to the Foundation Spec: drift tolerance bands, countdown default, invite expiry, join-code expiry, inactivity timeout, rate limits, recent-room retention, event and projection retention.
3. **Add the Domain Event Catalog** (name, version, payload, emitter, consumers) to the Foundation Spec or a referenced `docs/api/` companion.
4. **Add the Clock Synchronization Specification** to the Foundation Spec: offset estimation, sampling, refresh cadence, rejection rules, and target accuracy.
5. **Author `docs/api/po-tool-registry.md`** with per-tool input, output, error, and compliance-gate contracts, as promised by ADR-001.
6. **Add the Error Taxonomy and localization key namespace grammar** to the Foundation Spec.
7. **Add the Local-First Cache Specification** (cached aggregates, TTLs, reconciliation rules) to the Foundation Spec.
8. **Add the Rate-Limit Policy** and its owning layer to the Foundation Spec.
9. **ADR: Room lifecycle mapping** — product labels to persisted `room_status`, plus the legal transition table; auto-close resolves to `abandoned`.
10. **ADR: Sync mode is per room** — set from the room's provider, immutable while a playback session is open; participants downgrade, rooms do not.
11. **ADR: Read ownership** — `rooms.status` for lifecycle/listing/RLS, `room_state.playback_status` for the watching UI.
12. **ADR: Preference field ownership** — region, default provider, voice behaviour vs. device-local voice settings, font scale.
13. **ADR: Email invite is a link invite delivered by email** in v1; addressable non-user invites deferred.
14. **ADR: Notification channels vs. presentation modes**; `push` reserved and unemitted in v1.
15. **ADR: Po clarification precedence** — clarification rows are authoritative; session status is derived.
16. **ADR: Admin/moderator authorization table** added to the Database Spec entity catalog with the security-definer role check.
17. **ADR: Guest preview scope** for unauthenticated invite-link visitors, reflected in the RLS matrix.
18. **ADR: Block-during-active-room behaviour** and its enforcement points.
19. **ADR: Retention rule** — projection retention must never exceed `domain_events` retention.
20. **ADR: Room capacity** — schema envelope 2–8, domain-enforced cap of 4 in v1.
21. **Amend the MVP Spec** with: the label→state mapping, the domain-enforced capacity cap, the sync-mode rule, the invite model, channel vs. presentation modes, the deep-link fallback, the co-host non-goal, and the named second locale.
22. **Amend the Database Spec** with: annotated reserved enum values, field-ownership notes, the storage/bucket design for avatars, and the retention rule.
23. **Record accepted assumptions** (host authority, human cue compliance, enum lockstep by review, Realtime sufficiency, deep-link reliability) as dated, explicit limitations rather than silent premises.
24. **Schedule two validation spikes** before the sync module is frozen: achievable clock-sync accuracy, and Realtime fan-out timing against the tolerance table.
25. **Complete the legal review inputs**: provider ToS review for each named provider, YouTube terms for synchronized group playback, and the GDPR/DPDP erasure path.

---

## D. Final Readiness Assessment

**Verdict: Conditionally Ready.**

**Justification.** The conceptual architecture is coherent and internally consistent at the level that matters: the layering is strict, the compliance authority is genuinely centralized rather than advisory, the provider risk is isolated behind a plugin boundary and a status table, and the database is portable with a clear ownership model. Of the 34 items raised in the Architecture Alignment Report, none required redesign — every one resolves either as a documentation fix, a naming/ownership decision, or an accepted and recorded limitation. That is the signature of a sound design with an incomplete record, not an unsound design.

It is not Ready for Build Mode because the missing pieces are contracts, not details. The tie-breaker document that all four other documents cite is absent; the event catalog that the event bus, audit trail, and every projection depend on is enumerated nowhere; the tool contracts that Po is built against are deferred to a file that does not exist; and the countdown — the product's central promise — has neither an algorithm nor a numeric tolerance. Building any module before these exist would mean inventing them in code, which is precisely the failure mode the mandated Architecture → Review → Freeze → Build cycle is designed to prevent.

It is not Not Ready because nothing discovered contradicts the architecture itself. No blocker requires a new layer, a new aggregate root, or a change of vendor posture. The remaining work is authoring and adjudication, all of which is enumerated in Section C.

**Minimum checklist before Build Mode can begin** (the smallest set — Section C items 1–6, 9–13, 16, 17, 19, and the two spikes in 24):

1. Foundation Specification v1.0 committed to the repository.
2. System Constants table published, including drift tolerance bands.
3. Domain Event Catalog published with payload shapes and versions.
4. Clock Synchronization Specification published.
5. `docs/api/po-tool-registry.md` published with per-tool contracts.
6. Error taxonomy and localization key namespace grammar published.
7. ADR approved: room lifecycle mapping and transition table.
8. ADR approved: sync mode is per room and immutable during playback.
9. ADR approved: read ownership of `rooms.status` vs. `room_state.playback_status`.
10. ADR approved: preference field ownership (region, default provider, voice behaviour vs. device-local, font scale).
11. ADR approved: email invite model for v1.
12. ADR approved: admin/moderator authorization table added to the entity catalog.
13. ADR approved: guest preview scope and the corresponding RLS decision.
14. ADR approved: block-during-active-room behaviour.
15. ADR approved: projection retention never exceeds event retention.
16. Clock-sync accuracy and Realtime fan-out spikes completed and measured against the tolerance table.

On completion of those sixteen items, readiness moves from **72/100** to **Ready for Build Mode**, and the first module may open under the mandated cycle — Foundation contracts and events first, then infrastructure, repositories, domain services, features, presentation, one module at a time.

---

*End of Specification Reconciliation Report v1.0. No approved document was modified. No code or SQL was produced.*
