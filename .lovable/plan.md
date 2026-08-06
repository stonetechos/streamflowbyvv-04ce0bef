# StreamFlow v2.0 — Blueprint (restructured, implementation-facing)

Documentation only. No production code, no schema changes, no UI changes. Everything shipped (auth, profiles, friends, lobby, waiting room, invites, QR, countdown, voice, Po, notifications, presence, room lifecycle, provider launcher, design language, branding, realtime, ADRs) is preserved and re-organized — not redesigned.

## Structure

Four practical layers plus governance material, written into `docs/blueprint/`. `StreamFlow-Blueprint.md` is the authoritative index; the rest are its chapters.

```text
docs/blueprint/
  StreamFlow-Blueprint.md        index + Executive Summary (max 2 pages)
  A-product-operating-brief.md   thesis, users, launch scope, source types,
                                 sync tier model, room lifecycle summary,
                                 degraded-mode philosophy, KPIs and SLOs
  B-capability-matrix.md         source category x platform x sync tier x
                                 host/member limits x fallback x launch status
                                 x user-facing disclosure text
  C-engine-pack.md               the 13 engines, identical spec format
  D-milestone-roadmap.md         M0-M7, milestone first then engine
  E-scope-decisions.md           remove from v1 / defer / risky-but-acceptable /
                                 non-negotiable for launch
  F-reality-check.md             Hearo-like viability under ADR-014
  G-platform-foundation.md       future shared Vedora Vision capabilities
  H-native-architecture.md       Core Domain vs Web/Android/iOS/TV/Desktop adapters
  I-governance.md                the engineering constitution
  J-technical-debt.md            immediate / near-term / long-term register
  ADR-015-engine-decomposition.md  makes the engine model binding
```

## Engine spec format (applied identically to all 13)

Room, Timeline, Watch Party, Sync, Voice, Chat, Presence, Provider, Notification, Community, AI/Po, Analytics, Moderation.

- Responsibilities
- Non-responsibilities
- Current mapping to existing modules (file-level table, so nothing shipped is orphaned)
- Public contracts (vendor-neutral signatures)
- Published events
- Consumed events
- Dependencies (engine-to-engine, one directional)
- Lifecycle: init, bind, active, degrade, teardown
- Failure modes
- Degraded-mode behavior
- Scalability hot paths

Chat and Moderation have no existing implementation and are marked contract-only.

## Ground rules the blueprint enforces

- ADR-014 binding: no OTT playback control. No accessibility-service hacks, overlay automation, screen-capture automation, or illegal play/pause/seek. Sync Engine documents Tier A (true sync: YouTube, local, Drive), Tier B (observation-only where a real media session exists), Tier C (deep link + countdown + voice) and never promises more.
- Engines are a Domain-layer organizing model, not a new technical layer. Presentation → Feature → Domain → Repository → Infrastructure holds.
- No Supabase or LiveKit types in engine contracts.
- Foundation Spec v1.0, MVP Spec v1.0, Database Spec v1.0 stay frozen; extension happens through ADR-015. Every contradiction with an earlier spec is flagged explicitly in-line rather than silently overridden — including the still-missing Foundation Spec file that other docs cite.

## Governance section contents

Naming conventions, ADR policy, domain ownership, engine ownership, public contract rules, event versioning policy, backward compatibility policy, deprecation policy, feature flag policy, documentation standards.

## Milestone roadmap shape

M0 foundation instrumentation and architecture freeze · M1 private watch room MVP · M2 sync and room trust · M3 voice/chat maturity · M4 provider/source expansion via the capability matrix · M5 retention, scheduling, favorites, recurring groups · M6 premium and community controls · M7 optional AI/Po enhancements. Each milestone lists work per engine, with already-shipped work called out as the completed baseline.

## Out of scope

- No code, migrations, or config changes.
- No redesign of shipped features; classification only.
- No new provider integrations beyond what the capability matrix documents.
