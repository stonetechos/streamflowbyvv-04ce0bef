# ADR-012 — Retention Invariant for Projections

**Status:** Accepted. **Date:** v1.0 consolidation.
**Source:** Specification Reconciliation Report v1.0 §4 (Report item 32).
**Affects:** Database.
**Sections touched:** Database Spec §7 auditing strategy; Foundation Spec §14.4.

## Context

Three documents assume `activity_timeline` and `recent_partners` are always rebuildable from `domain_events`. Events retain 24 months; projection lifetime was unstated. If a projection outlived the events behind it, rebuild would silently produce incomplete data.

## Decision

**Invariant: projection retention must never exceed `domain_events` retention.**

Fixed v1.0 values (Foundation §14.4):

| Data | Retention |
|---|---|
| `domain_events` | 24 months |
| `activity_timeline`, `recent_partners` | 90 days |
| Po sessions and conversations | 30 days |
| Analytics events | 12 months |

90 days < 24 months, so the invariant holds. Any future change to either value must re-verify the invariant in the same ADR.

## Reasoning

Rebuildability is what makes projections disposable, and disposability is what allows them to be changed freely. Without the invariant the claim quietly becomes false, and the failure is invisible until a rebuild is attempted.

## Consequences

Retention jobs are ordered so a projection is never purged ahead of a schedule that would break rebuild. No schema change.
