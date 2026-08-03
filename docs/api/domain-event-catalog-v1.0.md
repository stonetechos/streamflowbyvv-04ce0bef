# StreamFlow — Domain Event Catalog v1.0

**Status:** Frozen (v1.0). Normative companion to Foundation Specification v1.0 §4.
**Scope:** Names, versions, payload shapes, emitters, and consumers for every v1.0 domain event. Documentation only.
**Change control:** New events or new versions require a numbered ADR.

---

## 1. Envelope

Every event, without exception, carries the same envelope. Only `payload` varies.

| Field              | Meaning                                                                           |
| ------------------ | --------------------------------------------------------------------------------- |
| `event_name`       | Stable identifier, `PascalCase`, past tense. Never renamed.                       |
| `event_version`    | Integer, starts at 1. A changed payload shape is a new version, never a mutation. |
| `aggregate_type`   | `profile`, `room`, `provider`, `po_session`, `feature_flag`.                      |
| `aggregate_id`     | UUID of the aggregate root.                                                       |
| `sequence`         | Monotonic per aggregate. Gapless.                                                 |
| `occurred_at`      | UTC `timestamptz`, server clock.                                                  |
| `correlation_id`   | Groups everything caused by one user intent, including Po utterances.             |
| `causation_id`     | The event or command that directly caused this one.                               |
| `actor_profile_id` | Nullable — null for system-originated events.                                     |
| `payload`          | Event-specific, documented below.                                                 |

**Rules.** Payloads never contain credentials, tokens, provider cookies, raw voice data, or free-text user content beyond what the event is about. Payloads carry identifiers and facts, not rendered strings. Retention is 24 months (Foundation §14.4).

---

## 2. Identity events — aggregate `profile`

| Event                      | v   | Payload                                              | Emitter     | Consumers                                |
| -------------------------- | --- | ---------------------------------------------------- | ----------- | ---------------------------------------- |
| `SignedUp`                 | 1   | `profile_id`, `code`, `locale`, `signup_method`      | UserService | `activity_timeline`, analytics           |
| `ProfileUpdated`           | 1   | `profile_id`, `changed_fields[]`                     | UserService | cache invalidation                       |
| `PreferencesUpdated`       | 1   | `profile_id`, `preference_table`, `changed_fields[]` | UserService | cache invalidation                       |
| `UserBlocked`              | 1   | `blocker_profile_id`, `blocked_profile_id`, `reason` | UserService | InvitationService, RoomService (ADR-011) |
| `UserUnblocked`            | 1   | `blocker_profile_id`, `blocked_profile_id`           | UserService | InvitationService                        |
| `AccountDeletionRequested` | 1   | `profile_id`, `requested_at`                         | UserService | erasure job                              |

---

## 3. Room events — aggregate `room`

| Event                  | v   | Payload                                                                   | Emitter     | Consumers                                  |
| ---------------------- | --- | ------------------------------------------------------------------------- | ----------- | ------------------------------------------ |
| `RoomCreated`          | 1   | `room_id`, `code`, `host_profile_id`, `name`, `visibility`, `max_members` | RoomService | `activity_timeline`, analytics             |
| `RoomProviderSelected` | 1   | `room_id`, `provider_id`, `sync_mode`, `compliance_verdict`               | RoomService | PlaybackService (ADR-003)                  |
| `MemberJoined`         | 1   | `room_id`, `profile_id`, `role`                                           | RoomService | presence, notifications, `recent_partners` |
| `MemberLeft`           | 1   | `room_id`, `profile_id`, `left_reason`                                    | RoomService | presence, notifications                    |
| `MemberRemoved`        | 1   | `room_id`, `profile_id`, `removed_by_profile_id`                          | RoomService | notifications                              |
| `MemberReadyChanged`   | 1   | `room_id`, `profile_id`, `is_ready`                                       | RoomService | room UI                                    |
| `RoomStatusChanged`    | 1   | `room_id`, `from_status`, `to_status`, `reason`                           | RoomService | projections, analytics (ADR-002)           |
| `RoomEnded`            | 1   | `room_id`, `end_reason`, `ended_at`, `participant_profile_ids[]`          | RoomService | `recent_partners`, `activity_timeline`     |

---

## 4. Invitation events — aggregate `room`

| Event             | v   | Payload                                                 | Emitter             | Consumers                        |
| ----------------- | --- | ------------------------------------------------------- | ------------------- | -------------------------------- |
| `InviteCreated`   | 1   | `invite_id`, `code`, `room_id`, `channel`, `expires_at` | InvitationService   | NotificationService              |
| `InviteDelivered` | 1   | `invite_id`, `channel`, `delivery_status`               | NotificationService | invite UI                        |
| `InviteAccepted`  | 1   | `invite_id`, `room_id`, `profile_id`                    | InvitationService   | RoomService, `activity_timeline` |
| `InviteDeclined`  | 1   | `invite_id`, `room_id`, `profile_id`                    | InvitationService   | invite UI                        |
| `InviteExpired`   | 1   | `invite_id`, `room_id`                                  | InvitationService   | invite UI                        |
| `InviteRevoked`   | 1   | `invite_id`, `room_id`, `revoked_by_profile_id`         | InvitationService   | invite UI                        |

---

## 5. Playback and sync events — aggregate `room`

| Event                    | v   | Payload                                                                         | Emitter         | Consumers                      |
| ------------------------ | --- | ------------------------------------------------------------------------------- | --------------- | ------------------------------ |
| `PlaybackSessionStarted` | 1   | `playback_session_id`, `code`, `room_id`, `provider_id`, `sync_mode`            | PlaybackService | analytics                      |
| `CountdownScheduled`     | 1   | `room_id`, `countdown_target_at`, `duration_seconds`, `scheduled_by_profile_id` | PlaybackService | all clients                    |
| `CountdownFired`         | 1   | `room_id`, `fired_at`                                                           | PlaybackService | all clients, `playback_events` |
| `CountdownCancelled`     | 1   | `room_id`, `cancelled_by_profile_id`, `reason`                                  | PlaybackService | all clients                    |
| `PlaybackStarted`        | 1   | `room_id`, `position_ms`, `anchor_server_time`                                  | PlaybackService | room UI                        |
| `PlaybackPaused`         | 1   | `room_id`, `position_ms`, `paused_by_profile_id`                                | PlaybackService | room UI                        |
| `PlaybackResumed`        | 1   | `room_id`, `position_ms`, `anchor_server_time`                                  | PlaybackService | room UI                        |
| `PlaybackSeeked`         | 1   | `room_id`, `from_position_ms`, `to_position_ms`, `actor_profile_id`             | PlaybackService | room UI                        |
| `PlaybackEnded`          | 1   | `playback_session_id`, `room_id`, `end_reason`                                  | PlaybackService | `activity_timeline`            |
| `ClockOffsetUpdated`     | 1   | `room_id`, `profile_id`, `clock_offset_ms`, `sample_count`, `quality_band`      | SyncService     | sync UI (Foundation §15)       |
| `DriftMeasured`          | 1   | `room_id`, `profile_id`, `drift_ms`, `quality_band`                             | SyncService     | sync UI                        |
| `ResyncRequested`        | 1   | `room_id`, `requested_by_profile_id`, `drift_ms`                                | SyncService     | PlaybackService                |
| `ResyncApplied`          | 1   | `room_id`, `position_ms`, `anchor_server_time`                                  | SyncService     | room UI                        |

`quality_band` is one of `excellent`, `good`, `warning`, `resync_required` per Foundation §14.5.

---

## 6. Voice events — aggregate `room`

| Event                         | v   | Payload                                                     | Emitter      | Consumers |
| ----------------------------- | --- | ----------------------------------------------------------- | ------------ | --------- |
| `VoiceSessionStarted`         | 1   | `voice_session_id`, `code`, `room_id`                       | VoiceService | room UI   |
| `VoiceParticipantJoined`      | 1   | `voice_session_id`, `profile_id`                            | VoiceService | room UI   |
| `VoiceParticipantLeft`        | 1   | `voice_session_id`, `profile_id`, `reason`                  | VoiceService | room UI   |
| `VoiceParticipantMuteChanged` | 1   | `voice_session_id`, `profile_id`, `is_muted`, `is_deafened` | VoiceService | room UI   |
| `VoiceQualityChanged`         | 1   | `voice_session_id`, `profile_id`, `connection_quality`      | VoiceService | room UI   |
| `VoiceSessionEnded`           | 1   | `voice_session_id`, `end_reason`                            | VoiceService | analytics |

No voice event ever carries a token, room secret, or audio data.

---

## 7. Provider and compliance events — aggregate `provider`

| Event                       | v   | Payload                                                               | Emitter           | Consumers                           |
| --------------------------- | --- | --------------------------------------------------------------------- | ----------------- | ----------------------------------- |
| `ProviderStatusChanged`     | 1   | `provider_id`, `from_status`, `to_status`, `effective_from`           | ProviderService   | NotificationService, provider cache |
| `ProviderCapabilityChanged` | 1   | `provider_id`, `capability`, `support_level`                          | ProviderService   | provider cache                      |
| `ComplianceVerdictIssued`   | 1   | `provider_id`, `region_code`, `action`, `rule_id`, `correlation_id`   | ComplianceService | audit, Po                           |
| `ComplianceActionBlocked`   | 1   | `provider_id`, `region_code`, `attempted_action`, `rule_id`, `origin` | ComplianceService | audit, Po                           |

---

## 8. Po events — aggregate `po_session`

| Event                      | v   | Payload                                                           | Emitter         | Consumers       |
| -------------------------- | --- | ----------------------------------------------------------------- | --------------- | --------------- |
| `PoSessionStarted`         | 1   | `po_session_id`, `code`, `profile_id`, `entry_surface`            | Po Core         | analytics       |
| `PoIntentRecognized`       | 1   | `po_session_id`, `intent_key`, `confidence`                       | Intent Engine   | Planning Engine |
| `PoPlanProposed`           | 1   | `po_session_id`, `plan_id`, `step_count`, `requires_confirmation` | Planning Engine | Po UI           |
| `PoClarificationRequested` | 1   | `po_session_id`, `clarification_id`, `slot_key`                   | Planning Engine | Po UI (ADR-008) |
| `PoClarificationAnswered`  | 1   | `po_session_id`, `clarification_id`, `slot_key`                   | Po Core         | Planning Engine |
| `PoPlanApproved`           | 1   | `po_session_id`, `plan_id`                                        | Po Core         | Tool Executor   |
| `PoToolExecuted`           | 1   | `po_session_id`, `plan_id`, `tool_key`, `status`                  | Tool Executor   | audit           |
| `PoPlanCompleted`          | 1   | `po_session_id`, `plan_id`, `outcome`                             | Tool Executor   | analytics       |
| `PoPlanFailed`             | 1   | `po_session_id`, `plan_id`, `error_code`                          | Tool Executor   | Po UI, audit    |
| `PoMemoryStored`           | 1   | `po_session_id`, `memory_id`, `memory_source`                     | Po Core         | memory UI       |
| `PoMemoryDeleted`          | 1   | `profile_id`, `memory_id`                                         | Po Core         | memory UI       |

Po events never carry raw utterance text. The utterance lives in `po_conversations` under the user's own retention (Foundation §14.4) and is referenced, never duplicated into the event stream.

---

## 9. Feature flag events — aggregate `feature_flag`

| Event                 | v   | Payload                                      | Emitter            | Consumers         |
| --------------------- | --- | -------------------------------------------- | ------------------ | ----------------- |
| `FeatureFlagChanged`  | 1   | `flag_id`, `key`, `from_state`, `to_state`   | FeatureFlagService | flag cache, audit |
| `FeatureFlagAssigned` | 1   | `flag_id`, `profile_id`, `assignment_source` | FeatureFlagService | flag cache        |

---

## 10. Projection dependencies

| Projection          | Rebuilt from                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `activity_timeline` | `RoomCreated`, `MemberJoined`, `RoomEnded`, `InviteSent`/`InviteAccepted`, `VoiceParticipantJoined`, `PlaybackEnded` |
| `recent_partners`   | `RoomEnded`                                                                                                          |

Both are disposable. Rebuildability holds only while projection retention stays below event retention (ADR-012).
