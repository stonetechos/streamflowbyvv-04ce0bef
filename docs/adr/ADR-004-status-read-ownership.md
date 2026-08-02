# ADR-004 — Read Ownership of Room Status vs. Playback Status

**Status:** Accepted. **Date:** v1.0 consolidation.
**Source:** Specification Reconciliation Report v1.0 §1.9 (Report item 9).
**Affects:** Architecture, Database, UI.
**Sections touched:** Database Spec §3.2 `rooms`, `room_state`; MVP Spec §5.

## Context

`rooms.status` and `room_state.playback_status` both carry `paused`. Which one the UI reads for a paused room was unspecified.

## Decision

| Concern | Authoritative column |
|---|---|
| Room lifecycle, listings, navigation, RLS | `rooms.status` |
| Watching-screen playback condition | `room_state.playback_status` |

**`rooms.status = paused` is not used to represent a paused video in v1.** A room with a paused video remains `active`; the pause lives in `room_state.playback_status`.

## Reasoning

Overloading lifecycle with playback would make every list query and every policy depend on transient playback churn — high write volume on a security-relevant column. Separating read owners is the minimal fix and requires no schema change.

## Consequences

The `paused` value on `room_status` remains in the enum, reserved and unused by v1 write paths.
