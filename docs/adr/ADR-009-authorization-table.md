# ADR-009 — Admin and Moderator Authorization Table

**Status:** Accepted. **Date:** v1.0 consolidation.
**Source:** Specification Reconciliation Report v1.0 §3 (Report item 20).
**Affects:** Architecture, Database.
**Sections touched:** Database Spec §3 entity catalog, §5 enumerations, §9 security model; Foundation Spec §10.4.

## Context

Database Spec security rule 6 requires "a separate authorization table … checked via a security-definer function", but no such entity appeared in the catalog. MVP reserves the admin and moderator roles.

## Decision

Add **`user_roles`** to the v1 entity catalog.

- **Purpose:** the sole authority on platform-level privilege.
- **Columns:** `id` (UUID PK), `profile_id` → `profiles.id`, `role` (enum `app_role`), audit set.
- **Enum `app_role`:** `admin`, `moderator`, `user`.
- **Uniqueness:** one row per (`profile_id`, `role`).
- **Access:** readable by the owning profile and by the security-definer role-check function; writable by service-level administration only. Never writable from the client.
- **Checked exclusively** through a security-definer function; policies never read the table directly in a way that recurses.

**Roles are never a column on `profiles`, and never read from client storage.**

## Reasoning

A security rule with no entity cannot be implemented correctly, and the alternative — a role column on the profile — is a documented privilege-escalation vector. This is the pattern the Database Spec already mandates; the ADR makes it exist.

## Consequences

One additive table, one enum, one function. Room roles (`host`, `co_host`, `guest`) are unaffected — they are membership attributes, not platform privileges.
