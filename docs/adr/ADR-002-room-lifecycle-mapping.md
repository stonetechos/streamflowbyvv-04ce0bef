# ADR-002 — Room Lifecycle Mapping and Transitions

**Status:** Accepted. **Date:** v1.0 consolidation.
**Source:** Specification Reconciliation Report v1.0 §1.1 (Report item 1).
**Affects:** Architecture, Database, UI, Implementation.
**Sections touched:** Database Spec §3.2 `rooms`, §5 `room_status`; MVP Spec §5.

## Context

The Database Specification enumerates `room_status` as `lobby, active, paused, ended, abandoned`. The MVP Specification names the lifecycle `Created → Waiting Room → … → Closed`. Two vocabularies for one state machine, and inactivity auto-close was unmapped.

## Decision

The persisted `room_status` enum is the single normative state machine. MVP lifecycle names are presentation labels mapped 1:1 onto it.

| Product label | Persisted `room_status` |
|---|---|
| Waiting Room | `lobby` |
| Watching | `active` |
| Paused | `paused` |
| Closed by host | `ended` |
| Auto-closed on inactivity | `abandoned` |

**Inactivity auto-close resolves to `abandoned`**, fired after the Foundation §14.3 timeout with zero present participants.

### Legal transitions

```text
lobby   → active | ended | abandoned
active  → paused | ended | abandoned
paused  → active | ended | abandoned
ended   → (terminal)
abandoned → (terminal)
```

Every transition emits `RoomStatusChanged` with `from_status`, `to_status`, and `reason`.

## Reasoning

Persisted state must win because RLS, projections, and events read it; product language must remain free to be human. Keeping `abandoned` distinct from `ended` preserves the analytic difference between an intentional end and an expired room, which is why two terminal values exist.

## Consequences

Clients derive labels from status, never the reverse. No new column, no schema change.
