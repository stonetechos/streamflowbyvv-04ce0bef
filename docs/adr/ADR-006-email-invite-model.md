# ADR-006 — Email Invite Is a Link Invite Delivered by Email

**Status:** Accepted. **Date:** v1.0 consolidation.
**Source:** Specification Reconciliation Report v1.0 §1.6 (Report item 6).
**Affects:** Database, UI, Implementation.
**Sections touched:** Database Spec §3.3 `invites`, §5 `invite_channel`; MVP Spec §3.7.

## Context

MVP §3.7 allows inviting by email. `invites.invitee_profile_id` requires an existing profile for direct invites and there is no email column, so an email invite to a stranger had no representation.

## Decision

For v1.0, an **email invite is a `link` invite delivered by email**. The invite row stores only a hashed token and no addressee. The recipient becomes a member only after signup, verification, and acceptance, with the invite preserved across the auth wall.

**Deferred:** addressable non-user invites (an email column with dedupe on later signup) are explicitly out of v1.

## Reasoning

This resolves the conflict with zero schema change and preserves the auth-wall journey already specified. Modelling strangers as rows introduces PII retention, GDPR and DPDP erasure obligations, and an abuse surface that the MVP has not scoped.

## Consequences

`invite_channel` remains `in_app` and `link`. No email column. Invite and join link expiry are both 24 hours per Foundation §14.2.
