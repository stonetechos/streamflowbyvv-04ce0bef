# StreamFlow by Vedora Vision — Database Specification v1.0

Status: Draft for review (documentation only — no SQL, no migrations, no code)
Depends on (frozen): Foundation Specification v1.0, ADR-001 Po Agent, MVP Functional Specification v1.0
Scope: Logical + physical database design for Version 1.0 (MVP), plus reserved extension points.

---

## 1. Design Principles

| Principle | Rule |
|---|---|
| Primary keys | Every table uses a UUID (v4/v7) surrogate primary key named `id`. No natural keys as PKs, no composite PKs except pure join tables where documented. |
| Human-readable codes | Business-visible entities carry an immutable `code` (e.g. `ROM-000001`, `USR-000001`, `INV-000001`). Codes are for humans/support/URLs — never for joins. |
| Naming | `snake_case`, plural table names, singular column names, `<table_singular>_id` for FKs, `is_`/`has_` for booleans, `_at` for timestamps, `_count` for denormalized counters. |
| Time | All timestamps are `timestamptz` stored in UTC. Never store local time; store IANA timezone strings separately when user intent matters. |
| Soft delete | `deleted_at` only where recovery/audit matters (user-authored or legally relevant rows). High-volume append-only telemetry is hard-deleted by retention job. |
| Migrations | Forward-only, numbered, immutable once merged. No destructive edits to shipped migrations; corrections ship as new migrations. |
| Audit | `created_at`, `updated_at` everywhere; `created_by`, `updated_by` on mutable business entities. |
| Events | Domain events are persisted (`domain_events`) as the integration seam for the internal event bus — the DB never calls the app, the app reads/streams events. |
| Foreign keys | Always declared with explicit `ON DELETE` intent documented per relationship. No orphan-tolerant designs. |
| Repository friendly | One aggregate root per repository; no cross-aggregate joins required for a single repository read. |
| RLS ready | Every table has a documented owner column and access matrix so policies are mechanical to derive. |
| Multi-language | User-facing catalog text is externalized to `localization_strings`; no hardcoded English in data rows. |
| Feature flags | `feature_flags` + `feature_flag_assignments` gate behavior; no schema branching per feature. |
| Portability | No Supabase-only constructs in the domain schema. Coupling to `auth.users` is isolated to exactly one table (`profiles`). |

### 1.1 Supabase coupling boundary

Only `profiles.auth_user_id` references Supabase `auth.users`. Every other table references `profiles.id`. Migrating off Supabase means replacing one column and one identity provider — the domain schema is untouched.

### 1.2 Human-readable code strategy

Format: `PREFIX-NNNNNN`, zero-padded, monotonically increasing per entity type, allocated from a dedicated sequence registry table (`code_sequences`). Codes are unique, immutable, never reused, and safe to display. Prefixes: `USR`, `ROM`, `INV`, `PLB` (playback session), `VOI` (voice session), `PRV` (provider), `POS` (Po session), `FLG` (feature flag), `NTF` (notification).

---

## 2. Standard Column Sets

**Audit set (all tables):** `created_at`, `updated_at`.
**Attribution set (mutable business entities):** `created_by` → `profiles.id` (nullable, `ON DELETE SET NULL`), `updated_by` → `profiles.id` (nullable, `ON DELETE SET NULL`).
**Soft-delete set (where marked):** `deleted_at` nullable; all default reads filter `deleted_at IS NULL`.
**Concurrency:** mutable state tables carry `version` (integer, optimistic lock) — notably `room_state`.
**Extensibility:** selected tables carry `metadata` (JSONB, default `{}`) for forward-compatible, non-queried attributes. Rule: anything filtered, sorted, or joined must be promoted to a real column in a later migration.

---

## 3. Entity Catalog — Version 1.0

Ordered by domain. Each entry: purpose, PK, code, columns, relationships, indexes, constraints, soft delete, audit, ownership, extensibility.

### 3.1 Identity & Profile

#### `profiles`
- **Purpose:** The single application-side identity record; the only bridge to the auth provider.
- **PK:** `id` (UUID). **Code:** `USR-NNNNNN`.
- **Columns:** `id`, `code`, `auth_user_id` (unique, auth provider subject), `display_name`, `handle` (unique, citext-style case-insensitive), `avatar_url`, `bio`, `locale` (BCP-47), `timezone` (IANA), `status` (enum `profile_status`), `last_seen_at`, `onboarding_completed_at`, `metadata`, audit set, `deleted_at`.
- **Relationships:** 1:1 with auth user; 1:N to nearly every other table; 1:1 with each preference table.
- **Indexes:** unique(`auth_user_id`), unique(`code`), unique(lower(`handle`)) where `deleted_at IS NULL`, index(`last_seen_at`) for presence sweeps.
- **Constraints:** handle charset/length check; `display_name` non-empty.
- **Soft delete:** Yes — deletion anonymizes and tombstones; downstream FKs use `SET NULL` or retain the tombstone.
- **Ownership:** Self.
- **Extensibility:** Reserved for social graph, subscription linkage, and device registry via FK from future tables (never by widening `profiles`).

#### Preference tables (one row per profile, 1:1)
Five separate tables instead of one wide table, so each can evolve, be cached, and be RLS-scoped independently. All: PK `id`, unique `profile_id`, no code, no soft delete, audit set, owner = the profile, `metadata` JSONB.

| Table | Key columns |
|---|---|
| `notification_preferences` | per-channel toggles (`in_app_enabled`, `push_enabled`, `email_enabled`), per-type map (`type_settings` JSONB keyed by `notification_type`), `quiet_hours_start`, `quiet_hours_end`, `quiet_hours_timezone` |
| `localization_preferences` | `language_code`, `region_code`, `date_format`, `time_format_24h`, `auto_detect_enabled` |
| `accessibility_preferences` | `mode` (enum `accessibility_mode`), `reduced_motion`, `high_contrast`, `screen_reader_hints_enabled`, `captions_default_on`, `font_scale` |
| `appearance_preferences` | `theme_mode` (enum), `accent_token`, `density`, `compact_room_layout` |
| `privacy_preferences` | `presence_visibility` (enum `visibility_scope`), `allow_invites_from` (enum), `analytics_opt_in`, `po_memory_opt_in`, `voice_auto_join` |

- **Indexes:** unique(`profile_id`) on each.
- **Note:** `privacy_preferences.po_memory_opt_in` and `analytics_opt_in` are the enforcement inputs for §3.9 and §3.8 writes.

### 3.2 Rooms

#### `rooms`
- **Purpose:** The watch-together session container; the aggregate root for membership, state, playback, voice, and invites.
- **PK:** `id`. **Code:** `ROM-NNNNNN` (also the shareable/joinable identifier surface).
- **Columns:** `id`, `code`, `name`, `host_profile_id` → `profiles.id`, `status` (enum `room_status`), `visibility` (enum `room_visibility`, v1 always `private`), `provider_id` → `providers.id` (nullable until chosen), `content_reference` (free text/URL the members agreed on — never credentials), `max_members` (default 4, MVP cap), `scheduled_start_at` (nullable, reserved for v1.1), `started_at`, `ended_at`, `join_code_hash` (nullable — hashed short join code, never plaintext), `join_code_expires_at`, `metadata`, audit + attribution set, `deleted_at`.
- **Relationships:** N:1 `profiles` (host); N:1 `providers`; 1:N `room_members`, `invites`, `playback_sessions`, `voice_sessions`, `sync_events`; 1:1 `room_state`.
- **Indexes:** unique(`code`), index(`host_profile_id`), index(`status`, `created_at desc`), partial index on `status IN ('lobby','active')` for the "my live rooms" query, index(`provider_id`).
- **Constraints:** `max_members` between 2 and 8 (v1 policy enforces 4); `ended_at >= started_at`; host must also exist as a `room_members` row (enforced by application invariant + event check, not a DB trigger in v1).
- **Soft delete:** Yes — rooms are user-authored and appear in activity history.
- **Ownership:** `host_profile_id`.
- **Extensibility:** `visibility` enum already supports future public/community rooms; `scheduled_start_at` reserved for scheduled parties.

#### `room_members`
- **Purpose:** Membership and role of a profile in a room (many-to-many resolution with attributes).
- **PK:** `id`. **Code:** none.
- **Columns:** `id`, `room_id`, `profile_id`, `role` (enum `room_role`: `host`, `co_host`, `guest`), `state` (enum `membership_state`: `invited`, `joined`, `left`, `removed`), `joined_at`, `left_at`, `is_muted_by_host`, `metadata`, audit set.
- **Relationships:** N:1 `rooms` (`ON DELETE CASCADE`), N:1 `profiles` (`ON DELETE CASCADE` — leaving the platform removes membership; historical presence lives in `activity_timeline`).
- **Indexes:** unique(`room_id`, `profile_id`), index(`profile_id`, `state`), index(`room_id`, `state`).
- **Constraints:** exactly one `host` per room (application invariant, unique partial index on `room_id where role='host'`).
- **Soft delete:** No — `state` models departure.
- **Ownership:** Room host owns the row lifecycle; the member owns their own `left` transition.

#### `room_presence`
- **Purpose:** Ephemeral connection/liveness signal per member (heartbeat), separate from durable membership.
- **PK:** `id`. **Code:** none.
- **Columns:** `id`, `room_id`, `profile_id`, `status` (enum `presence_status`), `connection_id`, `device_kind`, `last_heartbeat_at`, `latency_ms`, `clock_offset_ms` (client↔server clock skew used by the sync engine), audit set.
- **Relationships:** N:1 `rooms` (CASCADE), N:1 `profiles` (CASCADE).
- **Indexes:** unique(`room_id`, `profile_id`, `connection_id`), index(`room_id`, `status`), index(`last_heartbeat_at`) for the stale-sweeper.
- **Constraints:** none beyond FKs.
- **Soft delete:** No — hard-deleted by sweeper after TTL.
- **High volume:** Yes (write-heavy, short-lived). Candidate for `UNLOGGED`-style treatment or an external cache post-v1; v1 keeps it in PG for RLS simplicity.

#### `room_state`
- **Purpose:** The single authoritative, host-driven sync state for a room. One row per room.
- **PK:** `id`. **Code:** none.
- **Columns:** `id`, `room_id` (unique), `playback_status` (enum `playback_status`), `position_ms`, `playback_rate`, `anchor_server_time` (server clock at which `position_ms` was true), `countdown_target_at` (for coordinated manual-sync starts), `sync_mode` (enum `sync_mode`: `controlled`, `manual`), `last_actor_profile_id`, `version` (optimistic lock), audit set.
- **Relationships:** 1:1 `rooms` (CASCADE).
- **Indexes:** unique(`room_id`).
- **Constraints:** `position_ms >= 0`; `playback_rate > 0`; `version` monotonically increases.
- **Soft delete:** No.
- **Ownership:** Room host (and co-host) write; all members read.
- **Extensibility:** `sync_mode` allows verified provider remote-control plugins in v2 without schema change.

#### `invites`
- **Purpose:** A durable invitation to a room, addressed to a profile or an opaque link.
- **PK:** `id`. **Code:** `INV-NNNNNN`.
- **Columns:** `id`, `code`, `room_id`, `inviter_profile_id`, `invitee_profile_id` (nullable for link invites), `channel` (enum `invite_channel`: `in_app`, `link`), `status` (enum `invite_status`), `token_hash` (nullable, hashed link token), `expires_at`, `accepted_at`, `declined_at`, `revoked_at`, `metadata`, audit + attribution set, `deleted_at`.
- **Relationships:** N:1 `rooms` (CASCADE), N:1 `profiles` twice (`SET NULL` on inviter deletion to preserve history).
- **Indexes:** unique(`code`), unique(`token_hash`) where not null, index(`invitee_profile_id`, `status`), index(`room_id`, `status`), index(`expires_at`) for expiry sweeps.
- **Constraints:** link invites require `token_hash` and `expires_at`; direct invites require `invitee_profile_id`; unique pending invite per (`room_id`, `invitee_profile_id`).
- **Soft delete:** Yes.
- **Ownership:** Inviter; readable by invitee.

### 3.3 Notifications

#### `notifications`
- **Purpose:** Per-recipient in-app notification records (delivery log + inbox).
- **PK:** `id`. **Code:** `NTF-NNNNNN` (support traceability).
- **Columns:** `id`, `code`, `recipient_profile_id`, `type` (enum `notification_type`), `title_key`, `body_key`, `payload` (JSONB — interpolation params + deep-link target), `related_room_id` (nullable), `related_invite_id` (nullable), `channel` (enum `notification_channel`), `delivery_status` (enum `delivery_status`), `read_at`, `dismissed_at`, `expires_at`, audit set.
- **Relationships:** N:1 `profiles` (CASCADE), optional N:1 `rooms`/`invites` (`SET NULL`).
- **Indexes:** index(`recipient_profile_id`, `read_at`, `created_at desc`) — the inbox query; index(`delivery_status`) for retry workers; index(`expires_at`).
- **Constraints:** `title_key`/`body_key` are localization keys, not literal text.
- **Soft delete:** No — retention job deletes after 90 days.
- **Ownership:** Recipient (read/update own `read_at`); system writes.
- **High volume:** Yes — partition candidate by `created_at` month.

`notification_preferences` is defined in §3.1.

### 3.4 Voice

#### `voice_sessions`
- **Purpose:** A voice room lifecycle record mapped 1:1 (at a time) to a StreamFlow room; vendor-neutral wrapper over the SFU.
- **PK:** `id`. **Code:** `VOI-NNNNNN`.
- **Columns:** `id`, `code`, `room_id`, `provider_key` (`livekit` in v1 — vendor swappable), `external_session_ref` (opaque SFU room name/id; never a token or key), `status` (enum `voice_status`), `started_at`, `ended_at`, `peak_participant_count`, `metadata`, audit set.
- **Relationships:** N:1 `rooms` (CASCADE); 1:N `voice_participants`.
- **Indexes:** unique(`code`), index(`room_id`, `status`), partial unique on (`room_id`) where `status = 'active'`.
- **Constraints:** no credentials, tokens, or secrets stored — tokens are minted on demand server-side and never persisted.
- **Soft delete:** No.
- **Ownership:** Room host; members read.

#### `voice_participants`
- **Purpose:** Per-profile participation, mute state, and connection quality within a voice session.
- **PK:** `id`. **Code:** none.
- **Columns:** `id`, `voice_session_id`, `profile_id`, `status` (enum `voice_participant_status`), `is_muted`, `is_deafened`, `joined_at`, `left_at`, `connection_quality` (enum `connection_quality`), audit set.
- **Relationships:** N:1 `voice_sessions` (CASCADE), N:1 `profiles` (CASCADE).
- **Indexes:** unique(`voice_session_id`, `profile_id`, `joined_at`), index(`profile_id`).
- **Soft delete:** No.
- **Ownership:** Participant writes own mute state; host may force-mute (recorded via `room_members.is_muted_by_host`).

### 3.5 Providers & Compliance

#### `providers`
- **Purpose:** Catalog of streaming/media sources known to StreamFlow (YouTube, local file, Netflix, …). Reference data, admin-owned.
- **PK:** `id`. **Code:** `PRV-NNNNNN`. Also `key` (stable machine slug, e.g. `youtube`).
- **Columns:** `id`, `code`, `key` (unique), `display_name_key` (localization key), `category` (enum `provider_category`: `ott`, `video_platform`, `local_media`, `other`), `homepage_url`, `logo_asset_key`, `is_enabled`, `sort_order`, `metadata`, audit + attribution set, `deleted_at`.
- **Relationships:** 1:N `provider_capabilities`, `provider_status_history`, `provider_preferences`, `provider_compliance_rules`; 1:N `rooms`.
- **Indexes:** unique(`key`), unique(`code`), index(`is_enabled`, `sort_order`).
- **Soft delete:** Yes — providers are referenced historically.
- **Ownership:** Platform admin only. Read: all authenticated users.
- **Extensibility:** This table plus `provider_capabilities` *is* the plugin registry surface — adding an OTT provider is data, not schema.

#### `provider_capabilities`
- **Purpose:** What a provider can actually do, per capability dimension — the machine-readable Capability Matrix from the MVP spec.
- **PK:** `id`. **Columns:** `id`, `provider_id`, `capability` (enum `provider_capability`: `play_pause`, `seek`, `deep_link`, `position_read`, `embed`, `local_playback`), `support_level` (enum `capability_support_level`: `supported`, `manual_sync`, `experimental`, `unverified`, `unavailable`), `notes_key`, `verified_at`, `verified_by`, audit set.
- **Indexes:** unique(`provider_id`, `capability`), index(`support_level`).
- **Soft delete:** No. **Ownership:** Admin. Read: all.

#### `provider_status_history`
- **Purpose:** Append-only record of capability/availability changes, so degradation is explainable to users and auditors.
- **PK:** `id`. **Columns:** `id`, `provider_id`, `previous_status` (enum `provider_status`), `new_status`, `reason_key`, `effective_from`, `changed_by`, `created_at`.
- **Indexes:** index(`provider_id`, `effective_from desc`).
- **Soft delete:** No (append-only). **Ownership:** Admin write, all read.

#### `provider_preferences`
- **Purpose:** A user's own relationship with a provider — favorite, hidden, default. Never credentials.
- **PK:** `id`. **Columns:** `id`, `profile_id`, `provider_id`, `is_favorite`, `is_hidden`, `last_used_at`, audit set.
- **Indexes:** unique(`profile_id`, `provider_id`), index(`profile_id`, `last_used_at desc`).
- **Constraints:** Explicit prohibition (documented + enforced by review): no columns may ever store provider usernames, passwords, cookies, session tokens, or DRM material.
- **Soft delete:** No. **Ownership:** The profile.

#### `provider_compliance_rules`
- **Purpose:** The authoritative, queryable rule set the ComplianceService consults before permitting any provider action.
- **PK:** `id`. **Columns:** `id`, `provider_id`, `rule_key`, `action` (enum `compliance_action`: `allow`, `manual_only`, `warn`, `block`), `scope` (enum `compliance_scope`: `global`, `region`), `region_code` (nullable), `rationale_key`, `effective_from`, `effective_until`, audit + attribution set.
- **Indexes:** index(`provider_id`, `scope`, `region_code`), index(`effective_from`, `effective_until`).
- **Constraints:** `region_code` required when `scope = 'region'`; non-overlapping effective windows per (`provider_id`, `rule_key`, `region_code`) enforced at application level.
- **Soft delete:** No — superseded by new effective windows (audit-friendly).
- **Ownership:** Admin/legal only. Read: all (users must be able to see why something is blocked).

### 3.6 Playback & Sync

#### `playback_sessions`
- **Purpose:** One continuous watch attempt within a room (a "sitting") — the correlation key for playback and sync events.
- **PK:** `id`. **Code:** `PLB-NNNNNN`.
- **Columns:** `id`, `code`, `room_id`, `provider_id`, `sync_mode` (enum `sync_mode`), `content_reference`, `content_title` (user-entered label only), `duration_ms` (nullable), `started_at`, `ended_at`, `end_reason` (enum `session_end_reason`), `participant_count_at_start`, `metadata`, audit set.
- **Relationships:** N:1 `rooms` (CASCADE), N:1 `providers` (`RESTRICT`/`SET NULL` — provider rows are soft-deleted, not removed).
- **Indexes:** unique(`code`), index(`room_id`, `started_at desc`), index(`provider_id`, `started_at desc`).
- **Soft delete:** No — retained for history, removed with the room.
- **Ownership:** Room; readable by members.

#### `playback_events`
- **Purpose:** Append-only log of playback intents/actions (play, pause, seek, rate change, countdown fired) for reconciliation, debugging, and the activity timeline.
- **PK:** `id`. **Code:** none.
- **Columns:** `id`, `playback_session_id`, `room_id` (denormalized for query locality), `actor_profile_id` (nullable for system), `event_type` (enum `playback_event_type`), `position_ms`, `target_position_ms`, `occurred_at` (client intent time), `recorded_at` (server time), `payload` (JSONB), `created_at`.
- **Indexes:** index(`playback_session_id`, `recorded_at`), index(`room_id`, `recorded_at desc`).
- **Soft delete:** No — retention-managed.
- **High volume:** Yes — partition candidate by `recorded_at` month.

#### `sync_events`
- **Purpose:** Append-only record of synchronization corrections, drift measurements, and countdown coordination — distinct from user playback intent.
- **PK:** `id`. **Columns:** `id`, `room_id`, `playback_session_id` (nullable), `profile_id` (whose client reported/was corrected), `event_type` (enum `sync_event_type`: `drift_measured`, `resync_requested`, `resync_applied`, `countdown_scheduled`, `countdown_fired`, `clock_offset_updated`), `drift_ms`, `clock_offset_ms`, `authoritative_position_ms`, `recorded_at`, `payload`, `created_at`.
- **Indexes:** index(`room_id`, `recorded_at desc`), index(`playback_session_id`), index(`event_type`, `recorded_at`).
- **Soft delete:** No. **High volume:** Yes — partition candidate; 30–90 day retention.
- **Ownership:** Room-scoped; members read, system writes.

### 3.7 Feature Flags & Localization

#### `feature_flags`
- **PK:** `id`. **Code:** `FLG-NNNNNN`; also `key` (unique slug).
- **Columns:** `id`, `code`, `key`, `description`, `state` (enum `feature_flag_state`: `off`, `on`, `internal`, `percentage`, `targeted`), `rollout_percentage`, `default_value` (JSONB — supports boolean and multivariate), `is_permanent` (kill-switch vs temporary), audit + attribution set, `deleted_at`.
- **Indexes:** unique(`key`), unique(`code`), index(`state`).
- **Ownership:** Admin write; all authenticated read (evaluation is client-visible by design).

#### `feature_flag_assignments`
- **Purpose:** Explicit per-profile overrides and sticky bucket assignments.
- **Columns:** `id`, `feature_flag_id`, `profile_id`, `value` (JSONB), `source` (enum `assignment_source`: `manual`, `percentage_bucket`, `internal_tester`), `expires_at`, audit set.
- **Indexes:** unique(`feature_flag_id`, `profile_id`), index(`profile_id`).
- **Ownership:** Admin write; the profile may read its own assignments only.

#### `localization_strings`
- **Purpose:** Server-side catalog for DB-referenced keys (notification bodies, provider names, compliance rationales). Static UI copy stays in the app bundle; this table exists so data rows never contain English literals.
- **Columns:** `id`, `namespace`, `key`, `language_code`, `value`, `is_reviewed`, audit + attribution set.
- **Indexes:** unique(`namespace`, `key`, `language_code`), index(`language_code`).
- **Ownership:** Admin write; public read.
- **Extensibility:** New languages are rows; no schema change. Fallback chain (`region → language → default`) resolved in the domain layer, not the DB.

`localization_preferences`, `accessibility_preferences`, `appearance_preferences`, `privacy_preferences` are defined in §3.1.

### 3.8 Analytics, Events & Audit

#### `analytics_events`
- **Purpose:** Product telemetry, privacy-gated by `privacy_preferences.analytics_opt_in`.
- **Columns:** `id`, `profile_id` (nullable — dropped/anonymized when opted out), `anonymous_id`, `event_name`, `event_category`, `room_id` (nullable), `session_ref`, `properties` (JSONB, no PII), `client_platform`, `app_version`, `occurred_at`, `created_at`.
- **Indexes:** index(`event_name`, `occurred_at desc`), index(`profile_id`, `occurred_at desc`), BRIN on `occurred_at` for large scans.
- **Soft delete:** No — retention + right-to-erasure job.
- **High volume:** Highest in the system — partition by month from day one is acceptable; otherwise a documented partitioning trigger point at 10M rows.
- **Ownership:** System write only; users may read/erase their own rows (GDPR/DPDP).

#### `domain_events`
- **Purpose:** Durable, versioned, immutable domain event stream backing the Foundation Spec's internal event bus (`RoomJoined`, `PlaybackSeeked`, `InviteAccepted`, `PoPlanExecuted`, …).
- **Columns:** `id`, `event_type`, `event_version`, `aggregate_type`, `aggregate_id`, `sequence_no` (per aggregate), `actor_profile_id` (nullable), `payload` (JSONB), `correlation_id`, `causation_id`, `occurred_at`, `created_at`.
- **Indexes:** unique(`aggregate_type`, `aggregate_id`, `sequence_no`), index(`event_type`, `occurred_at desc`), index(`correlation_id`).
- **Constraints:** Immutable — no updates, no deletes inside the retention window.
- **Soft delete:** No. **High volume:** Yes — partition candidate by `occurred_at`.
- **Ownership:** System write; admin read; user-scoped read only via projections (`activity_timeline`), not raw.

#### `audit_logs`
- **Purpose:** Security/administrative audit trail — who did what to whom, distinct from business domain events.
- **Columns:** `id`, `actor_profile_id` (nullable for system), `actor_role`, `action`, `entity_type`, `entity_id`, `entity_code`, `before_state` (JSONB, redacted), `after_state` (JSONB, redacted), `ip_hash`, `user_agent_hash`, `occurred_at`, `created_at`.
- **Indexes:** index(`entity_type`, `entity_id`, `occurred_at desc`), index(`actor_profile_id`, `occurred_at desc`), index(`action`).
- **Constraints:** Append-only; never stores raw IPs, tokens, or credentials — hashed/redacted only.
- **Ownership:** Admin read; no user read in v1.

#### `activity_timeline`
- **Purpose:** A user-facing read model (projection) of domain events — "you watched X with Y", "Z joined your room". Built from `domain_events`, not written directly by features.
- **Columns:** `id`, `profile_id`, `activity_type`, `title_key`, `body_key`, `payload` (JSONB), `related_room_id`, `related_profile_id`, `occurred_at`, `is_hidden`, audit set.
- **Indexes:** index(`profile_id`, `occurred_at desc`), index(`related_room_id`).
- **Soft delete:** No — `is_hidden` lets users clear entries without breaking the projection.
- **Ownership:** The profile (read + hide); system writes.
- **Rebuildability:** Truncatable and fully regenerable from `domain_events` — a projection, never a source of truth.

### 3.9 Po (ADR-001)

All Po tables are hard-gated by `privacy_preferences.po_memory_opt_in` for anything persisted beyond the live session.

#### `po_sessions`
- **PK:** `id`. **Code:** `POS-NNNNNN`.
- **Columns:** `id`, `code`, `profile_id`, `room_id` (nullable — Po works inside and outside rooms), `status` (enum `po_session_status`: `active`, `awaiting_clarification`, `completed`, `failed`, `cancelled`, `expired`), `input_modality` (enum: `text`, `voice`), `model_provider_key`, `model_name`, `started_at`, `ended_at`, `metadata`, audit set, `deleted_at`.
- **Indexes:** unique(`code`), index(`profile_id`, `started_at desc`), index(`room_id`), index(`status`).
- **Notes:** `model_provider_key`/`model_name` are recorded for observability and provider-independence audits — never keys or endpoints.
- **Ownership:** The profile. No other user, including a room host, may read another member's Po session.

#### `po_conversations`
- **Purpose:** Ordered turns within a Po session (user utterance, assistant reply, system note).
- **Columns:** `id`, `po_session_id`, `turn_index`, `role` (enum `po_turn_role`: `user`, `assistant`, `system`, `tool`), `content` (text — redacted per privacy settings), `detected_intent`, `intent_confidence`, `token_usage` (JSONB), `occurred_at`, `created_at`, `deleted_at`.
- **Indexes:** unique(`po_session_id`, `turn_index`), index(`po_session_id`, `occurred_at`).
- **Soft delete:** Yes — user-initiated erasure must be immediate and visible.
- **Retention:** Deleted on session expiry unless memory opt-in; never used for model training.

#### `po_plans`
- **Purpose:** The multi-step plan Po produced for an intent (ADR-001 planning engine), with its steps and lifecycle.
- **Columns:** `id`, `po_session_id`, `goal_summary`, `status` (enum `po_plan_status`: `draft`, `awaiting_confirmation`, `approved`, `executing`, `completed`, `failed`, `abandoned`), `steps` (JSONB ordered step descriptors), `requires_confirmation`, `confirmed_at`, `compliance_checked_at`, `compliance_result` (enum `compliance_action`), `created_at`, `updated_at`.
- **Indexes:** index(`po_session_id`, `created_at desc`), index(`status`).
- **Note:** `steps` stays JSONB in v1 (plans are read/written whole); a normalized `po_plan_steps` table is the documented v1.1 promotion path if step-level querying is needed.

#### `po_clarifications`
- **Purpose:** Records the missing slots Po asked about and the answers received — the auditable proof that Po never guessed.
- **Columns:** `id`, `po_session_id`, `po_plan_id` (nullable), `slot_name`, `question_key_or_text`, `options` (JSONB), `answer`, `status` (enum `clarification_status`: `pending`, `answered`, `timed_out`, `cancelled`), `asked_at`, `answered_at`, `created_at`.
- **Indexes:** index(`po_session_id`, `status`), index(`po_plan_id`).

#### `po_tool_executions`
- **Purpose:** One row per Tool Registry invocation — the security and debugging ledger for everything Po actually did.
- **Columns:** `id`, `po_session_id`, `po_plan_id` (nullable), `step_index`, `tool_key`, `tool_version`, `status` (enum `tool_execution_status`: `pending`, `running`, `succeeded`, `failed`, `blocked_by_compliance`, `cancelled`), `input_payload` (JSONB, redacted), `output_payload` (JSONB, redacted), `error_code`, `error_message_key`, `compliance_decision` (enum `compliance_action`), `started_at`, `finished_at`, `duration_ms`, `created_at`.
- **Indexes:** index(`po_session_id`, `started_at`), index(`tool_key`, `status`), index(`status`).
- **Constraints:** Append-only after terminal status. Every execution must carry a compliance decision — no null when the tool touches a provider.
- **High volume:** Moderate — retention 90 days.

#### `po_preference_memories`
- **Purpose:** Explicit, opt-in, user-inspectable long-term memory (favorite provider, usual partners, preferred language). Never implicit inference.
- **Columns:** `id`, `profile_id`, `memory_key`, `memory_value` (JSONB), `source` (enum `memory_source`: `explicit_user_statement`, `user_setting`, `confirmed_suggestion`), `confidence`, `is_active`, `last_used_at`, `expires_at`, audit set, `deleted_at`.
- **Indexes:** unique(`profile_id`, `memory_key`) where `deleted_at IS NULL`, index(`profile_id`, `is_active`).
- **Constraints:** Writes are rejected (application-enforced) when `privacy_preferences.po_memory_opt_in` is false.
- **Soft delete:** Yes, plus a hard-purge path for "delete all my memories".
- **Ownership:** The profile — full read, edit, delete rights are a product requirement, not an option.

### 3.10 Social (Version 1.0 subset)

#### `recent_partners`
- **Purpose:** Lightweight "people you recently watched with" list that powers fast re-invite without a friends system.
- **Columns:** `id`, `profile_id`, `partner_profile_id`, `last_watched_at`, `session_count`, `is_pinned`, audit set.
- **Indexes:** unique(`profile_id`, `partner_profile_id`), index(`profile_id`, `last_watched_at desc`).
- **Soft delete:** No — user can clear (hard delete).
- **Ownership:** The owning profile only; the partner cannot see the row.
- **Derivation:** Maintained from `domain_events` (RoomEnded); safe to rebuild.

#### `blocked_users`
- **Purpose:** Hard safety control — blocks invites, presence visibility, and room joins in both directions.
- **Columns:** `id`, `blocker_profile_id`, `blocked_profile_id`, `reason` (enum `block_reason`, optional), `note`, `created_at`, `updated_at`.
- **Indexes:** unique(`blocker_profile_id`, `blocked_profile_id`), index(`blocked_profile_id`).
- **Constraints:** `blocker_profile_id <> blocked_profile_id`.
- **Soft delete:** No — unblocking deletes the row (an audit event is emitted).
- **Ownership:** Blocker; the blocked user must never be able to read this table.
- **Enforcement:** Invite creation, presence exposure, and room join checks all consult this table.

### 3.11 Platform Support Tables

- **`code_sequences`** — `id`, `prefix` (unique), `current_value`, `padding_width`, audit set. Allocates human-readable codes atomically. Admin/system only.
- **`schema_migrations`** — managed by the migration tool; forward-only ledger. Documented here for completeness only.

---

## 4. Deliberately Deferred Entities (Reserved, Not Built in v1)

Each is reserved by design so it can be added later as a purely additive migration — no rewrite of v1 tables.

| Reserved entity | Deferred because | Reservation mechanism (v1 cost: zero) |
|---|---|---|
| `friendships` / social graph | MVP explicitly ships without a friends list; `recent_partners` + `invites` cover the real v1 job. Building a bidirectional graph now would force request/accept flows, privacy surfaces, and notification types not in scope. | `recent_partners` and `blocked_users` already establish profile↔profile edge patterns; a future `friendships` table attaches to `profiles` with no change to existing tables. |
| `communities`, `community_members`, `community_rooms` | Public/community rooms are v2. | `rooms.visibility` enum already reserves `public` and `community`; a future `community_id` column is additive and nullable. |
| `group_watch_sessions` | v1 caps rooms at 4 members; the existing room model already generalizes to N. | `rooms.max_members` is a column, not a constant. |
| `ai_recommendations`, `watch_history_embeddings` | Explicit MVP non-goal, and recommendation data carries privacy weight that needs its own review. | `po_preference_memories` and `analytics_events` provide the eventual input signal; no v1 table is shaped against them. |
| `subscriptions`, `plans`, `payments`, `invoices` | No monetization in v1. | `profiles` is intentionally narrow; billing attaches by FK to `profiles.id`. Never widen `profiles` with billing columns. |
| `devices`, `device_sessions`, `push_tokens` | v1 is PWA-first; push arrives with Capacitor in v1.1. | `notification_preferences.push_enabled` and `notifications.channel` already model the channel; a `push_tokens` table attaches to `profiles`. |
| `smart_tv_endpoints`, `home_automation_hooks` | Long-horizon. | `room_presence.device_kind` and the provider plugin model absorb new client classes without schema change. |
| `provider_plugins` (installable code registry) | v1 providers are first-party catalog rows. | `providers.key` + `provider_capabilities` are the registry contract; a plugin manifest table attaches to `providers.id`. |
| `po_plan_steps` (normalized) | v1 reads/writes plans whole. | `po_plans.steps` JSONB; promotion path documented in §3.9. |
| `text_messages` (room chat) | v1.1 feature. | Room aggregate already owns child collections; chat attaches to `rooms.id`. |

---

## 5. Enumerations

Modeled as application-level enums mirrored by lookup/check constraints — **not** PostgreSQL native `ENUM` types. Rationale: native enums are painful to alter, order-sensitive, and reduce portability; check constraints or small reference tables are trivially migratable off Supabase/Postgres.

| Enum | Values |
|---|---|
| `profile_status` | `active`, `suspended`, `deactivated`, `deleted` |
| `visibility_scope` | `everyone`, `recent_partners`, `nobody` |
| `room_status` | `lobby`, `active`, `paused`, `ended`, `abandoned` |
| `room_visibility` | `private` (v1), `link` (v1), `public` (reserved), `community` (reserved) |
| `room_role` | `host`, `co_host`, `guest` |
| `membership_state` | `invited`, `joined`, `left`, `removed` |
| `presence_status` | `online`, `idle`, `buffering`, `disconnected`, `offline` |
| `playback_status` | `idle`, `ready`, `counting_down`, `playing`, `paused`, `buffering`, `ended` |
| `sync_mode` | `controlled`, `manual` |
| `session_end_reason` | `completed`, `host_ended`, `all_left`, `timeout`, `error` |
| `playback_event_type` | `play`, `pause`, `seek`, `rate_change`, `countdown_started`, `countdown_fired`, `ended` |
| `sync_event_type` | `drift_measured`, `resync_requested`, `resync_applied`, `countdown_scheduled`, `countdown_fired`, `clock_offset_updated` |
| `invite_status` | `pending`, `accepted`, `declined`, `expired`, `revoked` |
| `invite_channel` | `in_app`, `link` |
| `notification_type` | `room_invite`, `invite_accepted`, `room_starting`, `countdown_started`, `member_joined`, `member_left`, `voice_started`, `provider_status_changed`, `system_announcement` |
| `notification_channel` | `in_app`, `push`, `email` |
| `delivery_status` | `queued`, `sent`, `delivered`, `failed`, `suppressed` |
| `voice_status` | `provisioning`, `active`, `degraded`, `ended`, `failed` |
| `voice_participant_status` | `connecting`, `connected`, `reconnecting`, `disconnected` |
| `connection_quality` | `excellent`, `good`, `poor`, `unknown` |
| `provider_category` | `ott`, `video_platform`, `local_media`, `other` |
| `provider_capability` | `play_pause`, `seek`, `deep_link`, `position_read`, `embed`, `local_playback` |
| `capability_support_level` | `supported`, `manual_sync`, `experimental`, `unverified`, `unavailable` |
| `provider_status` | `available`, `degraded`, `manual_only`, `unavailable`, `retired` |
| `compliance_action` | `allow`, `manual_only`, `warn`, `block` |
| `compliance_scope` | `global`, `region` |
| `feature_flag_state` | `off`, `on`, `internal`, `percentage`, `targeted` |
| `assignment_source` | `manual`, `percentage_bucket`, `internal_tester` |
| `accessibility_mode` | `default`, `reduced_motion`, `high_contrast`, `screen_reader_optimized` |
| `theme_mode` | `system`, `light`, `dark` |
| `language_code` | BCP-47 strings, validated against `localization_strings` — **not** a fixed enum, so new languages never require a migration |
| `po_session_status` | `active`, `awaiting_clarification`, `completed`, `failed`, `cancelled`, `expired` |
| `po_turn_role` | `user`, `assistant`, `system`, `tool` |
| `po_plan_status` | `draft`, `awaiting_confirmation`, `approved`, `executing`, `completed`, `failed`, `abandoned` |
| `clarification_status` | `pending`, `answered`, `timed_out`, `cancelled` |
| `tool_execution_status` | `pending`, `running`, `succeeded`, `failed`, `blocked_by_compliance`, `cancelled` |
| `memory_source` | `explicit_user_statement`, `user_setting`, `confirmed_suggestion` |
| `block_reason` | `harassment`, `spam`, `unwanted_contact`, `other` |
| `activity_type` | `room_created`, `room_joined`, `watched_together`, `invite_sent`, `invite_accepted`, `voice_joined` |

---

## 6. Relationships

### 6.1 One-to-One
- `auth.users` ↔ `profiles` (the only auth coupling)
- `profiles` ↔ each of the five preference tables (created lazily on first write, defaults live in the domain layer)
- `rooms` ↔ `room_state`

### 6.2 One-to-Many
- `profiles` → `rooms` (as host), `invites`, `notifications`, `po_sessions`, `activity_timeline`, `recent_partners`, `blocked_users`
- `rooms` → `room_members`, `room_presence`, `invites`, `playback_sessions`, `voice_sessions`, `sync_events`
- `playback_sessions` → `playback_events`, `sync_events`
- `voice_sessions` → `voice_participants`
- `providers` → `provider_capabilities`, `provider_status_history`, `provider_compliance_rules`, `provider_preferences`
- `feature_flags` → `feature_flag_assignments`
- `po_sessions` → `po_conversations`, `po_plans`, `po_clarifications`, `po_tool_executions`
- `po_plans` → `po_tool_executions`, `po_clarifications`

### 6.3 Many-to-Many (always resolved with an attributed join entity)
- profiles ↔ rooms via `room_members`
- profiles ↔ providers via `provider_preferences`
- profiles ↔ feature_flags via `feature_flag_assignments`
- profiles ↔ voice_sessions via `voice_participants`
- profiles ↔ profiles via `recent_partners` and `blocked_users` (directed edges)

### 6.4 Cascade behavior

| Parent deleted | Child behavior | Rationale |
|---|---|---|
| `rooms` (hard) | CASCADE: `room_members`, `room_presence`, `room_state`, `invites`, `playback_sessions`, `playback_events`, `sync_events`, `voice_sessions` | The room is the aggregate root; its children have no meaning without it. |
| `rooms` (soft) | Children untouched; reads filter through the parent | Normal path — hard deletes are admin/GDPR only. |
| `profiles` (soft/anonymize) | Nothing cascades; `display_name` tombstoned | Preserves other users' room history and audit integrity. |
| `profiles` (hard, erasure request) | CASCADE: preferences, presence, memberships, notifications, po_* , recent_partners, blocked_users. SET NULL: `rooms.host_profile_id`, `invites.inviter_profile_id`, `playback_events.actor_profile_id`, `audit_logs.actor_profile_id`, `domain_events.actor_profile_id` | Erase personal data; retain the integrity of shared and audit records. |
| `providers` | RESTRICT hard delete; soft delete only | Historical sessions reference providers permanently. |
| `po_sessions` | CASCADE all Po children | Session is the Po aggregate root. |
| `feature_flags` | CASCADE assignments | Assignments are meaningless without the flag. |

### 6.5 Ownership & lifecycle rules
- **Aggregate roots:** `profiles`, `rooms`, `providers`, `po_sessions`, `feature_flags`. Repositories are defined per root; no repository reaches across roots.
- **Lifecycle dependency:** a room cannot be `active` without a `room_state` row; a `voice_session` cannot outlive its room; a `playback_session` closes when the room ends.
- **Host transfer:** changing `rooms.host_profile_id` must update the corresponding `room_members.role` in the same transaction and emit a `HostTransferred` domain event.

---

## 7. Auditing Strategy

| Layer | Mechanism | Purpose |
|---|---|---|
| Row audit | `created_at`, `updated_at` on all tables; `created_by`, `updated_by` on mutable business entities | "When and by whom was this row last touched" |
| Reversibility | `deleted_at` on user-authored entities (profiles, rooms, invites, feature flags, providers, po sessions/conversations/memories) | Recovery, dispute resolution, grace periods |
| Business history | `domain_events` — immutable, versioned, per-aggregate sequence numbers, correlation/causation IDs | Event-driven integration, replay, projection rebuild |
| Security history | `audit_logs` — admin and security-relevant actions, redacted before/after states, hashed IP/UA | Compliance, incident response |
| User-facing history | `activity_timeline` — a projection of `domain_events`, disposable and rebuildable | Product surface, never a source of truth |
| Compliance history | `provider_status_history`, `provider_compliance_rules` effective windows | Explains to users and regulators why an action was allowed or blocked, as of a date |

Rules: audit tables are append-only; `updated_by` is always the acting profile, never a service account impersonating a user; system actions record `actor_profile_id = NULL` with an explicit `actor_role`.

---

## 8. Performance

### 8.1 High-volume tables (ranked)
1. `analytics_events`
2. `domain_events`
3. `sync_events`
4. `playback_events`
5. `room_presence` (high write churn, low row count — sweeper-managed)
6. `notifications`
7. `po_tool_executions`

### 8.2 Key indexes and why

| Index | Query it serves |
|---|---|
| `rooms(host_profile_id)` + partial on `status IN ('lobby','active')` | "My active rooms" — the home screen's hottest query |
| `room_members(profile_id, state)` | "Rooms I'm in" without scanning rooms |
| `room_members(room_id, state)` unique(`room_id`,`profile_id`) | Membership checks on every RLS-evaluated read; also enforces no duplicate members |
| `room_presence(room_id, status)` + `(last_heartbeat_at)` | Live participant list; stale-connection sweeper |
| unique `room_state(room_id)` | Guarantees one authoritative state row; the sync read path is a single-row lookup |
| `invites(invitee_profile_id, status)` | Invite inbox badge |
| unique `invites(token_hash)` | Constant-time link redemption |
| `notifications(recipient_profile_id, read_at, created_at desc)` | Inbox + unread count in one index |
| `playback_events(playback_session_id, recorded_at)` | Session reconstruction and drift analysis |
| `sync_events(room_id, recorded_at desc)` | Live drift dashboards and post-hoc debugging |
| unique `domain_events(aggregate_type, aggregate_id, sequence_no)` | Ordering guarantee + idempotent append |
| `domain_events(correlation_id)` | Tracing one user action across services |
| BRIN on `analytics_events(occurred_at)` | Cheap time-range scans on an append-only, time-ordered table |
| `po_tool_executions(tool_key, status)` | Tool reliability metrics; compliance-block audits |
| unique `provider_capabilities(provider_id, capability)` | Capability matrix lookup on every room creation |
| unique lower(`profiles.handle`) | Case-insensitive handle uniqueness and lookup |
| All `code` columns unique | Support lookups by human-readable code |

### 8.3 Partitioning
Range-partition by `occurred_at`/`recorded_at`, monthly, with automated partition creation and drop-based retention:
- `analytics_events` — partition at launch (cheap now, expensive later)
- `domain_events` — partition when retention policy is finalized
- `sync_events`, `playback_events` — partition at ~10M rows
- `notifications` — partition at ~5M rows

### 8.4 Other performance rules
- Denormalized counters (`peak_participant_count`, `recent_partners.session_count`) are maintained by the domain layer and are rebuildable from events — never trusted as the source of truth.
- JSONB columns are never used in `WHERE` clauses on hot paths; promote to columns instead.
- Every list endpoint uses keyset pagination on `(created_at, id)`, not `OFFSET`.
- Retention: `room_presence` minutes, `sync_events` 30 days, `playback_events` 90 days, `notifications` 90 days, `po_tool_executions` 90 days, `analytics_events` 13 months, `audit_logs` 24 months, `domain_events` 24 months (then archived, not deleted).

---

## 9. Security Model (documented intent — policies derived from this table, no SQL here)

Roles referenced: **self** (the owning profile), **room member**, **room host**, **admin**, **system** (server-side service context), **anonymous**.

| Table | Owner | Read | Insert | Update | Delete |
|---|---|---|---|---|---|
| `profiles` | self | self (full); other users see a public subset (display_name, handle, avatar) unless blocked | system on signup | self | soft-delete by self; hard by admin/erasure |
| `*_preferences` (5) | self | self only | self | self | self |
| `rooms` | host | members + invitees | authenticated user | host / co-host | host (soft); admin (hard) |
| `room_members` | host | members of that room | host, or self when accepting an invite | host (role/mute); self (leave) | host (remove) |
| `room_presence` | self | members of that room | self | self | self or sweeper |
| `room_state` | host | members | system on room creation | host / co-host only | cascade only |
| `invites` | inviter | inviter + invitee | room host/co-host | inviter (revoke); invitee (accept/decline) | inviter (soft) |
| `notifications` | recipient | recipient only | system | recipient (`read_at`, `dismissed_at`) only | recipient; retention job |
| `voice_sessions` | host | members | system | system / host | cascade |
| `voice_participants` | participant | members of that room | system on join | self (mute/deafen); host (force-mute) | cascade |
| `providers` | admin | all authenticated (public catalog) | admin | admin | admin (soft) |
| `provider_capabilities` | admin | all authenticated | admin | admin | admin |
| `provider_status_history` | admin | all authenticated | admin/system | never (append-only) | never |
| `provider_preferences` | self | self only | self | self | self |
| `provider_compliance_rules` | admin/legal | all authenticated (users must see why they're blocked) | admin | admin | never — superseded by effective windows |
| `playback_sessions` | room | members | system | system | cascade |
| `playback_events` | room | members | system | never | retention job |
| `sync_events` | room | members | system | never | retention job |
| `analytics_events` | system | self (own rows); admin (aggregate) | system, gated on `analytics_opt_in` | never | self (erasure); retention job |
| `feature_flags` | admin | all authenticated | admin | admin | admin (soft) |
| `feature_flag_assignments` | admin | self (own only) | admin/system | admin/system | admin |
| `localization_strings` | admin | public (including anonymous) | admin | admin | admin |
| `domain_events` | system | admin; users only via `activity_timeline` | system | never | archive job |
| `audit_logs` | system | admin only | system | never | retention job |
| `activity_timeline` | self | self only | system (projection) | self (`is_hidden`) | self |
| `recent_partners` | self | self only | system | system | self |
| `blocked_users` | blocker | blocker only — the blocked user must never learn of it | blocker | blocker | blocker (unblock) |
| `po_sessions` | self | self only | self | self/system | self (soft) |
| `po_conversations` | self | self only | system | never | self (immediate erasure) |
| `po_plans` | self | self only | system | system | cascade |
| `po_clarifications` | self | self only | system | self (answer) | cascade |
| `po_tool_executions` | self | self; admin for abuse review | system | system until terminal | retention job |
| `po_preference_memories` | self | self only | self/system, gated on `po_memory_opt_in` | self | self (soft + hard purge) |
| `code_sequences` | system | system/admin | system | system | never |

### 9.1 Cross-cutting security rules
1. **No secrets in the database.** No provider passwords, cookies, session tokens, DRM keys, LiveKit tokens, or API keys are ever stored in any table. Join codes and invite tokens are stored hashed only.
2. **Deny by default.** Every table is unreadable until a policy grants access; there is no "public read" table except `localization_strings` and the provider catalog.
3. **Membership is the pivot.** Nearly every room-scoped policy resolves to "is there a `room_members` row for me in this room with state `joined`" — hence that index is a security-performance dependency, not just an optimization.
4. **Block enforcement is bidirectional** at invite creation, presence exposure, and room join.
5. **Po is private.** No room host, co-host, or other member may read another user's Po data under any policy.
6. **Admin is a role, not a user flag on `profiles`.** Roles live in a separate authorization table owned by the platform, checked via a security-definer function — never a client-writable column.
7. **Erasure is a first-class path** with a documented per-table decision (cascade vs anonymize vs retain) in §6.4.

---

## 10. Future-Proofing Summary

The v1 schema stays small by pushing extensibility into **data, enums, and additive FKs** rather than speculative tables:

- **Plugin architecture / new OTT providers** → rows in `providers` + `provider_capabilities` + `provider_compliance_rules`. Zero migrations to onboard a provider.
- **Communities & public rooms** → `rooms.visibility` enum values reserved; a `communities` table attaches later by nullable FK.
- **Group watch at scale** → `rooms.max_members` is data; the sync model is already N-participant.
- **AI recommendations** → attaches to `po_preference_memories` + `analytics_events`; no v1 table is shaped around it.
- **Payments & subscriptions** → attach to `profiles.id` by FK. `profiles` is deliberately narrow and must never grow billing columns.
- **Smart TV & home automation** → new `device_kind` values in `room_presence` plus a future `devices` table; the room/sync contract is unchanged.
- **Vendor migration off Supabase** → replace `profiles.auth_user_id`, swap Realtime for any pub/sub reading `domain_events`, swap LiveKit via `voice_sessions.provider_key`. No domain table changes.

**Guardrail:** any proposal to add a v1 table must show a v1.0 user journey (MVP Functional Specification) that fails without it. Otherwise it belongs in this section, not in §3.

---

## 11. Change Control

This document becomes the single source of truth for all future migrations and Supabase schema generation. Once frozen:
- Schema changes require a numbered ADR referencing the affected tables.
- Migrations are forward-only and must be traceable to a section of this document.
- No table, column, or enum value ships without appearing here first.
