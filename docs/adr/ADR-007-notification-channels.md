# ADR-007 — Notification Channels vs. Presentation Modes

**Status:** Accepted. **Date:** v1.0 consolidation.
**Source:** Specification Reconciliation Report v1.0 §1.7 (Report item 7).
**Affects:** Database, UI, Implementation.
**Sections touched:** Database Spec §3.5 `notifications`, §5 `notification_channel`; MVP Spec §9.

## Context

MVP §9 listed in-app, toast, email, audio cue, and persistent banner. The `notification_channel` enum is `in_app, push, email`. Toast, audio cue, and banner had no model, and `push` existed in the enum while MVP declares push a future feature.

## Decision

1. **Channels are delivery transports:** `in_app`, `push`, `email`. Only these are modelled.
2. **Toast, audio cue, and persistent banner are presentation modes of the `in_app` channel.** They are chosen by the Presentation layer from the notification type and are never stored as channels.
3. **`push` is reserved and emitted by no v1 code path.** The enum value and `notification_preferences.push_enabled` stay for the v1.1 Capacitor work; no device or token table exists in v1.

## Reasoning

Rendering style is a UI decision and must not enter the data model. A reserved enum value with a written "not emitted in v1" rule is cheaper than a future migration.

## Consequences

No enum change. Notification type drives presentation; the delivery record stays transport-only.
