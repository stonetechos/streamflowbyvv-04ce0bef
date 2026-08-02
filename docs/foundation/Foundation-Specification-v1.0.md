# StreamFlow by Vedora Vision — Foundation Specification v1.0

**Status:** Frozen (v1.0). Documentation only.
**Authority:** Tie-breaker document. Where any other approved document conflicts with this one, this one wins.
**Change control:** Extended only by numbered ADRs in `docs/adr/`. Never edited in place after freeze.

**Companion documents (normative):** `docs/api/domain-event-catalog-v1.0.md`, `docs/api/po-tool-registry.md`, `docs/foundation/storage-design-v1.0.md`, `docs/development/Build-Rules-v1.0.md`.

---

## 1. Purpose and Principles

StreamFlow is a coordination layer that lets two or more people watch the same content at the same time using their own accounts on their own devices. Media never passes through StreamFlow. The product's value is timing, presence, voice, and intent — not delivery.

| Principle | Rule |
|---|---|
| Vendor neutrality | Domain logic never names a vendor. Supabase, LiveKit, and AI providers exist only behind Infrastructure adapters. |
| Portability | The codebase must run unchanged in Cursor, Claude Code, VS Code, Windsurf, Emergent, and a standard React toolchain. |
| Legality first | Every provider-touching path passes through ComplianceService. Exactly one place to audit. |
| Explicitness | Unspecified behaviour is a defect, not a freedom. Constants live in §14, not in code. |
| One module at a time | Architecture → Review → Freeze → Build One Module. |
| Traceability | Nothing ships that cannot be traced to a section of an approved document. |

---

## 2. Layer Architecture

Strict one-directional dependency flow. A layer may depend only on the layer directly beneath it.

```text
Presentation   React components, routes, hooks, styling. Renders verdicts, never computes them.
     ↓
Feature        Orchestration of one user-facing capability. Owns view models and flows.
     ↓
Domain         Services, entities, value objects, business rules, events. Vendor-free.
     ↓
Repository     Aggregate-root persistence contracts, expressed in Domain terms.
     ↓
Infrastructure Supabase, LiveKit, AI providers, storage, IndexedDB, HTTP. The only vendor-aware layer.
```

**Prohibitions.** Presentation never imports Infrastructure. Domain depends on repository interfaces, never implementations. No layer reaches past the one below it. No vendor type crosses the Repository boundary.

---

## 3. Domain Services

| Service | Responsibility |
|---|---|
| RoomService | Room lifecycle, membership, capacity, host authority, closure. |
| PlaybackService | Playback sessions, countdowns, position anchoring, pause/resume/seek coordination. |
| SyncService | Clock offset estimation, drift measurement, re-sync decisions (§15). |
| VoiceService | Voice session lifecycle, participant state, quality reporting. Never persists tokens. |
| InvitationService | Invite creation, delivery request, acceptance, expiry, revocation. |
| PresenceService | Heartbeats, connection state, stale sweeping. |
| NotificationService | Notification creation, channel selection, delivery status, quiet hours. |
| AnalyticsService | Consent-gated event emission; no PII. |
| UserService | Profiles, handles, preferences, blocking, account lifecycle. |
| ProviderService | Provider catalog, capabilities, status history. Never controls a provider directly. |
| FeatureFlagService | Flag evaluation and assignment. |
| LocalizationService | Locale resolution, key lookup, plural and direction rules (§17). |
| ComplianceService | Single authority on what is permitted, per provider, per region, as of a date. Holds veto. |

**Compliance supremacy.** No service, feature, or agent may perform a provider-sensitive action without a ComplianceService verdict. Po holds no rules of its own.

---

## 4. Internal Event Bus

Domain events are immutable, versioned, per-aggregate-sequenced facts. Services publish; projections and adapters subscribe; the database never calls the application.

- Every event carries `event_name`, `event_version`, `aggregate_type`, `aggregate_id`, `sequence`, `occurred_at`, `correlation_id`, `causation_id`, `actor_profile_id`, `payload`.
- Append-only. A changed shape is a new version, never a mutation.
- Projections (`activity_timeline`, `recent_partners`) are disposable and rebuildable from events.
- The normative catalog is `docs/api/domain-event-catalog-v1.0.md`.

---

## 5. Repositories

One repository per aggregate root: `profiles`, `rooms`, `providers`, `po_sessions`, `feature_flags`. No cross-aggregate joins in a single repository read. Interfaces are declared in Domain terms and implemented in Infrastructure; swapping the database is an Infrastructure change only.

---

## 6. Provider SDK

Providers are plugins behind one interface. Every provider is `unverified` until explicitly classified. Support levels: `supported`, `manual_sync`, `experimental`, `unverified`, `unavailable`.

**Absolute prohibitions.** No DRM circumvention. No subscription, paywall, or region bypass. No proxying, caching, re-hosting, or transcoding of copyrighted media. No scraping or driving an unpublished interface. No storage, sharing, or relay of provider credentials, cookies, session tokens, or DRM material. No presenting an unverified provider as controllable.

**Only lawful hand-off:** a deep link opening the provider in the user's own session on their own device, with a documented web fallback when a native app does not open.

---

## 7. Feature Flags

Every module ships behind a flag. States: `off`, `on`, `internal`, `percentage`, `targeted`. Flags gate behaviour; they never branch the schema.

---

## 8. Local-First Strategy

Normative cache and reconciliation rules are in §18. Principle: the app remains legible offline and recovers deterministically on reconnect, with the server always authoritative for room and playback state.

---

## 9. Cross-Cutting Strategies

**Analytics.** Consent-gated, no PII, no free-text content. `anonymous_id` is per-install, regenerated on data clear and on opt-out, never joined to a profile after identification.

**Notifications.** `in_app`, `push`, `email` are *channels* (delivery transports). Toast, audio cue, and persistent banner are *presentation modes* of the `in_app` channel and are never modelled as channels. `push` is reserved and emitted by no v1 code path (ADR-007).

**Localization.** See §17.

**User and social system.** Profiles stay deliberately narrow. Social features attach by FK to `profiles.id` and never widen `profiles`. v1 ships `recent_partners` and `blocked_users` only.

**AI foundation.** Model-agnostic adapters; no provider name reaches the Domain layer. Memory is opt-in, viewable, editable, deletable. Full architecture in ADR-001.

---

## 10. Security, Legal Compliance, and Data

1. Secrets never live in the database or the client bundle.
2. Voice audio is never recorded, buffered to disk, or relayed through StreamFlow.
3. Provider credentials are never requested, stored, or transmitted.
4. Roles live in a separate authorization table checked by a security-definer function — never a column on `profiles` (ADR-009).
5. Every table has a documented owner and access matrix.
6. Object storage rules are normative in `docs/foundation/storage-design-v1.0.md`.
7. GDPR and India DPDP: erasure anonymizes the profile, tombstones the identity, and removes analytics linkage.

---

## 11. Database Standards

UUID surrogate keys named `id`; human-readable display codes (`USR-`, `ROM-`, `INV-`, `PLB-`, `VOI-`, `PRV-`, `POS-`, `FLG-`, `NTF-`) never joined on; `snake_case`; plural tables; UTC `timestamptz`; forward-only immutable migrations; enums as application constants plus check constraints, never native PG enum types. Only `profiles.auth_user_id` touches the auth provider. Full design in the Database Specification v1.0.

**Enum drift control.** Application constants are the single source of truth, and every enum-touching migration carries a review checklist item confirming constants and check constraints match.

---

## 12. Documentation Structure

```text
docs/
  foundation/   Foundation Specification, storage design
  adr/          Numbered architecture decision records
  product/      MVP Functional Specification
  database/     Database Specification
  api/          Domain event catalog, Po tool registry
  audit/        Alignment and reconciliation reports (historical record)
  development/  Build rules
```

---

## 13. Mandatory Workflow

**Architecture → Review → Freeze → Build One Module.** A module opens only after the previous one closes. Each module ships with its contract, domain events, error taxonomy, localization keys, feature flag, accessibility behaviour, and analytics events — never as follow-ups. Architecture changes arrive only as new numbered ADRs. Approved documents are never edited in place after freeze.

---

## 14. System Constants (normative)

Fixed product decisions, superseded only by a future ADR. Every default in the Database Specification and every user-facing duration in the MVP Specification resolves to a value here.

### 14.1 Countdown
| Constant | Value | Configurable |
|---|---|---|
| Default countdown duration | 5 seconds | Yes, per user preference |
| Allowed countdown range | 3–60 seconds | Fixed |

### 14.2 Invitations
| Constant | Value | Configurable |
|---|---|---|
| Invite expiry | 24 hours | Fixed |
| Join link expiry | 24 hours | Fixed |

### 14.3 Rooms
| Constant | Value | Configurable |
|---|---|---|
| Room inactivity timeout | 30 minutes with zero present participants | Fixed |
| Recent room retention (read-only in Recent) | 30 days | Fixed |
| Room capacity, v1 domain-enforced | 4 members | Fixed (schema envelope 2–8, ADR-013) |

### 14.4 Retention
| Data | Retention |
|---|---|
| `domain_events` | 24 months |
| Projections (`activity_timeline`, `recent_partners`) | 90 days |
| Po sessions and conversations | 30 days |
| Analytics events | 12 months |

**Retention invariant (ADR-012):** projection retention must never exceed `domain_events` retention. 90 days < 24 months holds.

### 14.5 Synchronization quality bands
| Band | Offset / drift | Product behaviour |
|---|---|---|
| Excellent | ≤ 100 ms | Quality badge only |
| Good | 101–250 ms | Green badge; no action |
| Warning | 251–500 ms | Amber badge; re-sync offered |
| Re-sync required | > 500 ms | Red badge; re-sync prompted |

These are simultaneously engineering targets and product constants. No alternative values may be invented.

---

## 15. Clock Synchronization (normative)

**Purpose.** Every countdown renders against server time corrected by the client's own measured offset, never against local device time.

**Offset estimation.** The client performs a round-trip exchange with the server, recording client send time, server time, and client receive time, and derives the offset with the round-trip delay halved. Samples with an anomalous round-trip relative to the recent median are rejected. The working offset is the median of retained samples, not the mean.

**Sampling.** A burst is taken on join, on reconnect, and before a countdown is scheduled. A lighter periodic refresh runs while the room is open and is carried on the presence heartbeat as `clock_offset_ms`.

**Target accuracy.** The estimated offset must fall in the Excellent or Good band of §14.5 for a countdown to be scheduled without warning. The Warning band schedules with an advisory; the Re-sync Required band blocks scheduling until re-measured.

**Recorded facts.** Offset updates as `clock_offset_updated`; drift observations as `drift_measured`; applied corrections as `resync_applied`.

**Validation obligation.** Achievable accuracy and Realtime fan-out timing are measured against §14.5 before the sync module is frozen. A measurement that cannot meet the bands is an architectural issue requiring a new ADR — never a silent relaxation of the constants.

---

## 16. Error Taxonomy and Localization Key Grammar (normative)

### 16.1 Error code grammar
`SF-<DOMAIN>-<CONDITION>` — uppercase, hyphen-separated, stable forever once shipped. Domains: `AUTH`, `ROOM`, `INVITE`, `SYNC`, `VOICE`, `PROVIDER`, `COMPLIANCE`, `PO`, `NET`, `SYS`.

Every error carries `code`, `message_key`, `severity` (`info`, `warning`, `error`, `fatal`), `retryable`, and an optional `recovery_action_key`.

### 16.2 Localization key grammar
`<area>.<feature>.<element>.<variant>` — lowercase, dot-separated, ASCII. Reserved areas: `common`, `auth`, `room`, `invite`, `sync`, `voice`, `provider`, `compliance`, `po`, `settings`, `notification`, `error`, `a11y`.

- `notifications.title_key` and `notifications.body_key` resolve under `notification.*`.
- Every `error_message_key` resolves under `error.*` and corresponds 1:1 to an error code.
- Every user-facing string is a key from the first commit; retrofitting localization is a documented non-option.

---

## 17. Localization (normative)

**Launch locales for v1.0:** English (`en`) and Hindi (`hi-IN`). No other locale ships in v1.

**Extensibility requirement.** The localization system must support unlimited additional languages without redesign: locales are data, never code branches; `language_code` is a BCP-47 string validated against `localization_strings`, never a fixed enum, so a new language never requires a migration.

**Structural rules.** Layout primitives are direction-aware from the first commit so a future RTL locale requires no relayout. Plural handling uses CLDR plural categories. Dates, times, and numbers are formatted through the locale, never concatenated. No string is assembled from fragments.

---

## 18. Local-First Cache (normative)

**Store.** IndexedDB, one versioned database, one object store per cached aggregate.

| Cached aggregate | Contents | TTL |
|---|---|---|
| Profile and preferences | Own profile and the five preference rows | Until changed; refreshed on app start |
| Room shell | Rooms the user is a member of: code, name, status, members | 30 days, aligned to §14.3 |
| Playback reference | Last known `room_state` snapshot for an open room | Session only |
| Provider catalog | Providers, capabilities, current status | 24 hours |
| Localization bundles | Active locale strings | Until bundle version changes |
| Feature flags | Last evaluated flags | 1 hour |

**Reconciliation on reconnect.** The server is authoritative for room, membership, playback, and compliance state — the cached copy is discarded on conflict, never merged. Only user-authored preference writes made while offline are replayed, last-write-wins by client timestamp, and only if the profile still exists. Room state is never replayed from cache: it is re-fetched, the clock offset is re-measured, and the position is re-anchored from `room_state.anchor_server_time` + `position_ms`. Voice is re-joined, never restored.

**Never cached.** Tokens of any kind, voice credentials, provider credentials, and Po memories when `po_memory_opt_in` is false.

---

## 19. Rate-Limit Policy (normative)

Enforced in the Domain layer in front of the repository, so every caller — UI, Po, or API — is limited identically. Per profile unless stated.

| Surface | Limit |
|---|---|
| Room creation | 10 per hour |
| Invite creation | 30 per hour, 10 per room |
| Join attempts by code | 20 per hour |
| Re-sync requests | 12 per room per hour |
| Po turns | 60 per hour |
| Notification email sends | 20 per day |

Exceeding a limit returns an `SF-<DOMAIN>-RATE-LIMITED` error with a `recovery_action_key`. Values are constants under §14 change control.

---

## 20. Accepted Assumptions (recorded limitations, v1.0)

1. **Host authority.** The host's client is the sync authority. No host migration in v1; if the host leaves permanently the room closes with notice. Migration is v1.1.
2. **Human cue compliance.** In manual sync the technical guarantee is cue delivery accuracy, not playback alignment.
3. **Enum lockstep.** Check-constraint enums stay aligned with application constants by the §11 review checklist.
4. **Realtime sufficiency.** Supabase Realtime is assumed sufficient for countdown-grade fan-out, contingent on the §15 validation spike.
5. **Deep-link reliability.** Native app opening is outside StreamFlow's control; a web fallback is always offered and reliability is never promised.

---

*End of Foundation Specification v1.0. Frozen.*
