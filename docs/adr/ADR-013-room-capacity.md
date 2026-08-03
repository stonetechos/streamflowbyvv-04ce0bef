# ADR-013 — Room Capacity: Schema Envelope vs. Domain Cap

**Status:** Accepted. **Date:** v1.0 consolidation.
**Source:** Specification Reconciliation Report v1.0 §1.4 (Report item 4).
**Affects:** Database, Implementation.
**Sections touched:** Database Spec §3.2 `rooms.max_members`; MVP Spec §5.

## Context

The Database Spec sets `rooms.max_members` default 4 with a check between 2 and 8, annotated "v1 policy enforces 4". The MVP states four flatly and lists larger rooms as v2. The 2–8 range therefore permits a state the product forbids.

## Decision

- **Schema envelope:** `max_members` keeps its default of 4 and its check constraint of 2–8. The check is documented as a _future envelope_, not a product statement.
- **Domain cap:** RoomService enforces a maximum of **4 members** in v1.0 (Foundation §14.3). Any value above 4 is unreachable in v1 by policy, not by schema.
- An attempt to exceed the cap returns `SF-ROOM-INVALID-CAPACITY`.

## Reasoning

Widening a check constraint later is a migration; narrowing a policy is a constant. The schema-envelope-plus-domain-policy split is what was already intended — the contradiction was only that the intent was unstated as a rule.

## Consequences

No schema change. Raising the cap in a later version is a constant change plus an ADR, with no migration until 8 is exceeded.
