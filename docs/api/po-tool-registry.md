# StreamFlow — Po Tool Registry v1.0

**Status:** Frozen (v1.0). Normative companion to ADR-001 §7 and §16.
**Scope:** The concrete contracts for every tool Po may invoke in Version 1.0. Documentation only — no code, no schemas in executable form.
**Change control:** New tools or changed contracts require a numbered ADR.

---

## 1. Registry rules

1. Po Core contains no capability. Everything Po can do is a registered tool.
2. A tool is a thin, typed façade over exactly one **Domain service** method. Tools never reach the Repository or Infrastructure layers.
3. Every tool declares: `key`, purpose, inputs, outputs, error codes, whether it mutates state, whether it requires user confirmation, and whether it is compliance-gated.
4. **Compliance gate.** Any tool marked compliance-gated must receive a `ComplianceService` verdict before execution. A `block` or `manual_only` verdict halts the step; Po explains the refusal and offers the lawful alternative. Po may never re-ask, retry, or route around a verdict.
5. **Confirmation gate.** Any mutating tool with external visibility (invites, room closure, countdown start) requires explicit user confirmation of the plan before execution.
6. Every execution is recorded as `PoToolExecuted` with its status, and every denial as `ComplianceActionBlocked`, both carrying the originating utterance's `correlation_id`.
7. Tool errors use the Foundation §16.1 grammar. A tool never invents a recovery path; it returns the error and Po reports it.
8. Adding a capability means registering a tool. Po Core is never modified for a new capability.

---

## 2. Tool contracts

Legend — **M** = mutating, **C** = requires confirmation, **G** = compliance-gated.

### Rooms

| Tool | Flags | Inputs | Outputs | Errors |
|---|---|---|---|---|
| `room.create` | M, C | `name?`, `provider_key?`, `max_members?` | `room_id`, `code` | `SF-ROOM-RATE-LIMITED`, `SF-ROOM-INVALID-CAPACITY` |
| `room.get_current` | — | none | `room_id`, `code`, `status`, `member_count`, `sync_mode` | `SF-ROOM-NOT-FOUND` |
| `room.list_recent` | — | `limit?` | `rooms[]` (`code`, `name`, `ended_at`) | — |
| `room.select_provider` | M, C, G | `room_id`, `provider_key` | `sync_mode`, `compliance_verdict` | `SF-COMPLIANCE-BLOCKED`, `SF-PROVIDER-UNAVAILABLE` |
| `room.set_ready` | M | `room_id`, `is_ready` | `is_ready` | `SF-ROOM-NOT-MEMBER` |
| `room.leave` | M, C | `room_id` | `left_at` | `SF-ROOM-NOT-MEMBER` |
| `room.close` | M, C | `room_id` | `ended_at`, `end_reason` | `SF-ROOM-NOT-HOST` |

### Invitations

| Tool | Flags | Inputs | Outputs | Errors |
|---|---|---|---|---|
| `invite.create` | M, C | `room_id`, `channel` (`in_app` \| `link`), `handle?` | `invite_id`, `code`, `expires_at` | `SF-INVITE-RATE-LIMITED`, `SF-INVITE-BLOCKED-PARTY`, `SF-INVITE-ROOM-FULL` |
| `invite.list_pending` | — | `room_id` | `invites[]` (`code`, `status`, `expires_at`) | — |
| `invite.revoke` | M, C | `invite_id` | `revoked_at` | `SF-INVITE-NOT-OWNER` |

Per ADR-006, an email invite in v1 is a `link` invite delivered by email. There is no tool that invites a non-user by address.

### Playback and synchronization

| Tool | Flags | Inputs | Outputs | Errors |
|---|---|---|---|---|
| `playback.schedule_countdown` | M, C | `room_id`, `duration_seconds?` (default and range per Foundation §14.1) | `countdown_target_at` | `SF-SYNC-CLOCK-UNRELIABLE`, `SF-ROOM-NOT-HOST`, `SF-SYNC-INVALID-DURATION` |
| `playback.cancel_countdown` | M | `room_id` | `cancelled_at` | `SF-SYNC-NO-COUNTDOWN` |
| `playback.pause` | M, G | `room_id` | `position_ms` | `SF-COMPLIANCE-MANUAL-ONLY` |
| `playback.resume` | M, C, G | `room_id` | `countdown_target_at` | `SF-COMPLIANCE-MANUAL-ONLY` |
| `playback.seek` | M, C, G | `room_id`, `to_position_ms` | `announced_position_ms` | `SF-COMPLIANCE-MANUAL-ONLY`, `SF-SYNC-OUT-OF-RANGE` |
| `sync.request_resync` | M | `room_id` | `countdown_target_at` | `SF-SYNC-RATE-LIMITED` |
| `sync.get_quality` | — | `room_id` | `clock_offset_ms`, `drift_ms`, `quality_band` | — |

In `manual` sync mode, `playback.pause`, `playback.resume`, and `playback.seek` coordinate a cue for every participant; they never drive a provider. A `supported` provider is driven only through its published interface.

### Voice

| Tool | Flags | Inputs | Outputs | Errors |
|---|---|---|---|---|
| `voice.join` | M | `room_id` | `voice_session_id`, `participant_status` | `SF-VOICE-PERMISSION-DENIED`, `SF-VOICE-UNAVAILABLE` |
| `voice.leave` | M | `room_id` | `left_at` | — |
| `voice.set_mute` | M | `room_id`, `is_muted` | `is_muted` | — |

No voice tool ever returns or accepts a token.

### Providers and compliance

| Tool | Flags | Inputs | Outputs | Errors |
|---|---|---|---|---|
| `provider.list` | — | `category?` | `providers[]` (`key`, `name`, `status`, `support_level`) | — |
| `provider.get_capabilities` | — | `provider_key` | `capabilities[]`, `support_level`, `sync_mode` | `SF-PROVIDER-NOT-FOUND` |
| `provider.open_deep_link` | M, G | `room_id`, `provider_key`, `content_reference?` | `deep_link_target`, `fallback_target` | `SF-COMPLIANCE-BLOCKED`, `SF-PROVIDER-UNAVAILABLE` |
| `compliance.check` | G | `provider_key`, `action`, `region_code` | `action` (`allow` \| `manual_only` \| `warn` \| `block`), `explanation_key`, `rule_id` | — |

`compliance.check` is the only tool Po may call to *learn* a verdict, and it is advisory to Po but binding on the executor.

### Content reference

| Tool | Flags | Inputs | Outputs | Errors |
|---|---|---|---|---|
| `content.set_reference` | M, C | `room_id`, `reference` | `reference` | `SF-ROOM-NOT-HOST` |

`reference` is the members' own agreed title or link. StreamFlow never resolves, scrapes, or validates it against a provider catalogue in v1.

### User and preferences

| Tool | Flags | Inputs | Outputs | Errors |
|---|---|---|---|---|
| `user.get_preferences` | — | `preference_area` | `preferences` | — |
| `user.set_preference` | M, C | `preference_area`, `field`, `value` | `field`, `value` | `SF-SYS-INVALID-VALUE` |
| `user.list_recent_partners` | — | `limit?` | `partners[]` (`handle`, `display_name`) | — |

### Po memory

| Tool | Flags | Inputs | Outputs | Errors |
|---|---|---|---|---|
| `memory.list` | — | none | `memories[]` (`memory_id`, `summary`, `source`) | — |
| `memory.store` | M, C | `summary`, `source` | `memory_id` | `SF-PO-MEMORY-OPT-OUT` |
| `memory.delete` | M, C | `memory_id` | `deleted_at` | `SF-PO-MEMORY-NOT-FOUND` |

Memory tools are inert unless `privacy_preferences.po_memory_opt_in` is true.

---

## 3. Tools that deliberately do not exist in v1

Recorded so their absence is a decision, not an oversight: no tool reads a provider's playback position, no tool authenticates to a provider, no tool schedules a future party, no tool sends a message to a room, no tool creates or promotes a co-host, no tool grants a role, and no tool searches a provider's catalogue. Each corresponds to a v1 non-goal or a compliance prohibition.
