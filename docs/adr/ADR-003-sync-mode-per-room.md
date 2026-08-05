# ADR-003 — Sync Mode Is a Property of the Room

**Status:** Accepted. **Date:** v1.0 consolidation.
**Source:** Specification Reconciliation Report v1.0 §2 (Report item 13).
**Affects:** Architecture, Database, UI, Implementation.
**Sections touched:** Database Spec §3.2 `room_state.sync_mode`, §5 `sync_mode`; MVP Spec §7.

## Context

It was unspecified whether YouTube's true synchronized playback and manual-sync coordination could be active simultaneously in one room, and what `room_state.sync_mode` holds when the provider is `supported` but a participant is on a different player.

## Decision

**One sync mode per room.** `room_state.sync_mode` is set from the room's selected provider at provider selection time and is **immutable while a playback session is open**.

- A `supported` provider sets `controlled`.
- Every other support level sets `manual`.
- A participant who cannot use the controlled path is **downgraded to the room's mode** for their own client. The room is never upgraded or downgraded to match one participant.
- Changing provider requires closing the open playback session; a new session opens with the new mode.

## Reasoning

Two concurrent authorities over one timeline is unresolvable at runtime. The room model already assumes a single provider intent, so the room is the correct owner of the mode. Downgrading a participant is degradation; upgrading a room from one participant's capability would silently change every other participant's contract.

## Consequences

`RoomProviderSelected` carries `sync_mode`. No schema change — this fixes the semantics of an existing column.

## Amendment (ADR-014)

ADR-014 supersedes this record's implied expectation that the `supported` provider set grows over time. Per the feasibility assessment, `controlled` is reachable **only** for YouTube and local files; every premium OTT provider is permanently `manual`. The decision above is unchanged — one sync mode per room, owned by the room — but the mapping from provider to mode is now a closed set, not a roadmap.
