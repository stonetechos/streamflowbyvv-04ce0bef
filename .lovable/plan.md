# StreamFlow v2.0 — Master Architecture & Engineering Blueprint

Documentation only. No production code, no schema changes, no UI changes. Everything already built (auth, profiles, friends, lobby, waiting room, invites, QR, countdown, voice, Po, notifications, presence, room lifecycle, provider launcher, design language, branding, realtime, ADRs) is preserved and re-organized into engines — not redesigned.

## What gets produced

A new `docs/blueprint/` set, written as one constitution split into readable parts so each future sprint can cite a section. `StreamFlow-v2.0-Blueprint.md` is the authoritative index; the rest are its chapters.

```text
docs/blueprint/
  StreamFlow-v2.0-Blueprint.md      index, vision, philosophy, principles, pillars
  01-domain-architecture.md          bounded contexts, domain model, layering rules
  02-engine-architecture.md          the 13 engines, one section each
  03-event-architecture.md           full domain event catalog v2 (extends v1.0)
  04-realtime-architecture.md        WebSocket vs WebRTC ownership, channels, backpressure
  05-provider-capability-matrix.md   capability-driven provider engine (binds ADR-014)
  06-watch-party-lifecycle.md        the 14-stage lifecycle, states, guards, events
  07-community-layer.md              friends, groups, clubs, communities, scheduled/recurring
  08-ai-layer-po.md                  Po as watch companion (extends ADR-001)
  09-platform-adapters.md            core engine vs Web/Android/iOS/Android TV/Apple TV
  10-observability.md                metrics, tracing, logging, crash, quality KPIs
  11-scalability.md                  1K -> 10M staged plan with cost/bottleneck per tier
  12-security-privacy.md             threat model, RLS posture, data classes, retention
  13-monetization.md                 tiers, entitlements, where billing sits in the model
  14-roadmap.md                      multi-year product roadmap
  15-sprint-roadmap.md               all future sprints reorganized BY ENGINE
  ADR-015-engine-decomposition.md    the ADR that makes this binding
```

## Engine specification format

Every one of the 13 engines (Room, Timeline, Watch Party, Sync, Voice, Chat, Presence, Provider, Notification, Community, AI/Po, Analytics, Moderation) gets an identical section:

- Responsibilities and explicit non-responsibilities
- Ownership: which bounded context and which existing `src/domain/*` modules map into it
- Public API surface (contract signatures, vendor-free)
- Events published and consumed
- Dependencies (engines only, one-directional)
- Lifecycle: init, bind, active, degrade, teardown
- Scalability characteristics and hot paths
- Failure handling and degraded-mode behavior

Each engine section includes a **Current mapping** table pointing at existing files so no built feature is orphaned. Chat and Moderation are new engines with no existing implementation and will be marked as contract-only.

## Constraints the blueprint enforces

- ADR-014 remains binding: no OTT playback control. The Sync Engine specifies Tier A (true sync: YouTube, local), Tier B (assisted/observed), Tier C (coordinated manual) and never proposes accessibility services, overlay automation, screen capture, or Cast for play/pause/seek.
- Existing layering holds: Presentation → Feature → Domain → Repository → Infrastructure. Engines are a Domain-layer organizing concept, not a new layer.
- Vendor neutrality: no Supabase/LiveKit types in engine contracts.
- Foundation Spec v1.0, MVP Spec v1.0, Database Spec v1.0 stay frozen; the blueprint extends them via ADR-015 and flags any contradiction rather than silently overriding.
- The still-missing Foundation Spec citation issue is recorded again in the index, not resolved here.

## Sprint roadmap reorganization

Section 15 re-cuts all remaining work by engine rather than feature: each engine gets a numbered sprint track (e.g. `SYNC-1`, `CHAT-1`, `MOD-1`) with dependencies between tracks, so parallel work is explicit. Already-shipped work is listed as the completed baseline of each track.

## Out of scope

- No code, migrations, or config changes.
- No redesign of shipped features; only re-classification.
- No new provider integrations proposed beyond the capability matrix.
