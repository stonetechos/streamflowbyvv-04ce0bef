# ADR-005 — Preference Field Ownership

**Status:** Accepted. **Date:** v1.0 consolidation.
**Source:** Specification Reconciliation Report v1.0 §1.2, §1.3, §1.5 (Report items 2, 3, 5).
**Affects:** Database, UI, Implementation.
**Sections touched:** Database Spec §3.1 preference tables, §3.7 `provider_preferences`; MVP Spec §10.

## Context

Three ownership conflicts: MVP put "region" and "default provider" under Provider Preferences while `provider_preferences` holds only `is_favorite`, `is_hidden`, `last_used_at`; MVP's Voice settings page specified microphone, speaker, join-muted, and push-to-talk with no owning table; MVP placed "text size" under Appearance while `font_scale` lives under accessibility.

## Decision

**One owner per field.**

| Field | Owner | Note |
|---|---|---|
| `is_favorite`, `is_hidden`, `last_used_at` | `provider_preferences` (per user, per provider) | Unchanged |
| Region | `localization_preferences.region_code` | Single source; ComplianceService reads it |
| Default provider | A single nullable provider reference on the user's provider-scoped preferences | Singleton per user, never a repeated flag |
| Join-muted, push-to-talk, voice auto-join | `privacy_preferences` (portable voice behaviour, alongside existing `voice_auto_join`) | Follows the user across devices |
| Default microphone, default speaker | **Device-local storage only** | Never persisted to the database |
| `font_scale` | `accessibility_preferences` | Storage owner |

The Appearance settings page may surface the accessibility `font_scale` control. That is a UI placement, not a second field.

## Reasoning

A per-provider table cannot express a singleton choice without an integrity risk. Region drives compliance verdicts globally; duplicating it per provider would let rows contradict each other and make verdicts non-deterministic. Device identifiers are not portable and would produce invalid state on every new device; behaviour is portable and must be. Splitting on portability is the only rule that survives Capacitor and multi-device use.

## Consequences

Settings pages read from owners, not from page-shaped tables. No preference value is stored twice.
