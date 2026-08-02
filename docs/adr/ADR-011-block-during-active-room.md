# ADR-011 — Blocking During an Active Shared Room

**Status:** Accepted. **Date:** v1.0 consolidation.
**Source:** Specification Reconciliation Report v1.0 §2 (Report item 17).
**Affects:** UI, Implementation.
**Sections touched:** Database Spec §3.10 `blocked_users`, §9; MVP Spec safety journeys.

## Context

The `blocked_users` enforcement points were listed, but the behaviour when a block occurs *during* an active shared room was unspecified.

## Decision

A block created while both parties are in the same active room takes effect as follows:

1. **Immediately** for all future invites and joins in both directions — neither party can invite or join the other again.
2. **The in-progress room continues to its natural end.** No participant is ejected mid-session.
3. **The blocking user may leave at any time**, and the leave affordance is surfaced alongside the block confirmation.
4. The blocked party is never told a block occurred; `blocked_users` remains invisible to them.
5. After the room ends, neither party appears in the other's `recent_partners`.

## Reasoning

Any deterministic rule is acceptable; no rule means two clients diverge on a safety-relevant path. Ejecting mid-session would silently disclose the block to the blocked party, which contradicts the existing invisibility rule. Leaving is always available, so the blocking user is never trapped.

## Consequences

No schema change. Enforcement lives in InvitationService and RoomService, driven by the `UserBlocked` event.
