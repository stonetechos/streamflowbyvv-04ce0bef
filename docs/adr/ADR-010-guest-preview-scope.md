# ADR-010 — Guest Preview Scope for Invite Links

**Status:** Accepted. **Date:** v1.0 consolidation.
**Source:** Specification Reconciliation Report v1.0 §2 (Report item 18).
**Affects:** Database, UI.
**Sections touched:** Database Spec §9 security model; MVP Spec §3.

## Context

What an unauthenticated visitor holding an invite link may see of a private room, before the auth wall, was unspecified. This is an RLS-visible decision, not an implementation detail.

## Decision

An unauthenticated visitor presenting a valid, unexpired invite token may see **only**:

- the room display name,
- the inviter's display name and avatar,
- the fact that the invite is valid and when it expires.

They may **not** see: the member list or member count, the selected provider, the content reference, room state, playback position, voice status, or the room code.

An invalid, expired, or revoked token shows a generic "this invite is no longer valid" screen that reveals nothing about whether the room exists.

## Reasoning

Enough to make the auth wall meaningful, nothing more. Any richer preview leaks private-room membership and viewing activity to anyone who obtains a link. The generic failure screen prevents the invite endpoint from becoming a room-existence oracle.

## Consequences

The preview is served by a narrow token-scoped read path, not by relaxing room policies. No schema change.
