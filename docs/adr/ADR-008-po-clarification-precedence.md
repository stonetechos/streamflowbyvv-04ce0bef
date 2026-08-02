# ADR-008 — Po Clarification Precedence

**Status:** Accepted. **Date:** v1.0 consolidation.
**Source:** Specification Reconciliation Report v1.0 §1.8 (Report item 8).
**Affects:** Architecture, Database, Implementation.
**Sections touched:** ADR-001 §10; Database Spec §3.9 `po_sessions`, `po_clarifications`, §5 `po_session_status`, `clarification_status`.

## Context

`po_session_status` includes `awaiting_clarification` while `po_clarifications.status` also has `pending` — two sources of truth for one condition, with no stated precedence.

## Decision

**`po_clarifications` is authoritative.** A session is awaiting clarification if and only if an open clarification row exists for it.

`po_sessions.status = awaiting_clarification` is a **derived convenience state**, maintained as a strict function of that condition. On any disagreement, the clarification rows win and the session status is repaired to match.

## Reasoning

The denormalized status is worth keeping for query cost, but only with a written derivation rule. Without stated precedence, two subsystems can legitimately disagree and Po stalls with no way to recover deterministically.

## Consequences

No schema change. The session status field is documented as derived, and repair is a read-path responsibility.
