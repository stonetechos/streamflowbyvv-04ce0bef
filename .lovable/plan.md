# StreamFlow v2.0 Architecture Constitution — blueprint plan (amended)

Documentation only. No production code, no schema changes, no UI changes. Everything shipped (auth, profiles, friends, lobby, waiting room, invites, QR, countdown, voice, Po, notifications, presence, room lifecycle, provider launcher, design language, branding, realtime, ADRs) is preserved and re-organized — not redesigned.

## Structure

Four practical layers plus governance material, written into `docs/blueprint/`. `StreamFlow-Blueprint.md` is the authoritative index; the rest are its chapters.

```text
docs/blueprint/
  StreamFlow-Blueprint.md        index + Executive Summary (max 2 pages)
  A-product-operating-brief.md   thesis, users, launch scope, source types,
                                 sync tier model, room lifecycle summary,
                                 degraded-mode philosophy, KPIs and SLOs,
                                 plus the LAUNCH ENVELOPE as a first-class section
  B-capability-matrix.md         source category x platform x sync tier x
                                 host/member limits x fallback x launch status
                                 x user-facing disclosure text
  C-engine-pack.md               the 14 engines, identical spec format
  C2-experience-engine.md        UX Engine: motion, animation, transitions,
                                 haptics, accessibility, empty/loading states,
                                 onboarding, delight, visual consistency
  C3-state-management.md         persistent / realtime / session / cached /
                                 derived / offline state principles
  C4-performance-budget.md       measurable budgets every certification checks
  C5-product-principles.md       immutable principles as architecture constraints
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

## Engine spec format (applied identically to all 14)

Room, Timeline, Watch Party, Sync, Voice, Chat, Presence, Provider, Notification, Community, AI/Po, Analytics, Moderation, Experience (UX).

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

Chat and Moderation have no existing implementation and are marked contract-only. Each engine section also declares which state classes it owns (see amendment 2) and which product principles bind it (amendment 4).

## Mandatory amendments (approved additions)

1. **Experience (UX) Engine** — a full engine section plus its own chapter, since it spans every surface: motion, animation, transitions, haptics, accessibility, empty states, loading states, onboarding, delight, and visual consistency. It owns the emotional quality of StreamFlow and explicitly owns no business logic; it maps onto the existing design system, localization, and accessibility foundations.
2. **State Management Principles** — one document classifying persistent, realtime, session, cached, derived, and offline state, with rules for ownership, invalidation, and conflict resolution. Binding on every engine.
3. **Performance Budget** — numeric targets with measurement method and pass/fail threshold for invite-to-join latency, voice connection latency, ready propagation latency, countdown spread, reconnect recovery, cold launch, warm launch, memory, CPU, battery impact, and network utilization. These are certification targets for every future release.
4. **Product Principles** — immutable principles written as architecture constraints: never fake synchronization; always disclose provider limitations; people over content; the room experience is the product; minimize friction; voice should feel effortless. Cross-referenced from the engines they constrain.

On completion the set is frozen and labelled **StreamFlow v2.0 Architecture Constitution**, amendable only by numbered ADR.

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
