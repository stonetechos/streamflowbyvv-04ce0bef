# ADR-015: Engine Decomposition and Constitution Freeze at v2.0.0

```text
ADR-015: Engine Decomposition and Constitution Freeze at v2.0.0
Status:              Accepted
Date:                2026-08-06
Dependencies:        ADR-001, ADR-002, ADR-003, ADR-013, ADR-014
Supersedes:          none
Superseded by:       none
Affected Engines:    all 13 Domain Engines and the Experience Engine
Affected Milestones: M0, M1, M2, M3, M4, M5, M6, M7
Constitution impact: establishes the StreamFlow v2.0 Architecture Constitution v2.0.0 (all chapters)
```

## Context

StreamFlow v1.0 shipped and was production-certified, but its architecture was documented across several specifications with overlapping authority, provider-name-based capability claims, and no single Definition of Done. ADR-014 established that premium OTT playback control is neither achievable nor permitted, which invalidates any brand-keyed tier language. A binding organizing model and a single certification authority are required before further implementation.

## Decision

1. **Engine decomposition is binding.** StreamFlow has 13 Domain Engines: Room, Timeline, Watch Party, Sync, Voice, Chat, Presence, Provider, Notification, Community, AI/Po, Analytics, Moderation. Their specifications in [C — Engine Pack](./C-engine-pack.md) are authoritative.

2. **The Experience Engine is not a Domain Engine.** It is a cross-cutting presentation-support subsystem owning motion, animation, accessibility, onboarding, loading states, empty states, delight, and visual consistency, and owning no business state, playback authority, room authority, synchronization authority, permissions, or domain decisions.

3. **Engines are a Domain-layer organizing model**, not a new technical layer. Presentation → Feature → Domain → Repository → Infrastructure is unchanged, and no vendor type may appear in an engine contract.

4. **Capability tiers are capability-based, never provider-based.** Tier applies to a `source · adapter · platform · version` tuple. Tier A additionally requires a passing certification record; without one the runtime treats the capability as Tier C.

5. **Certification is the Definition of Done.** [K](./K-launch-certification.md) defines the thirteen mandatory matrix columns, the nine reusable certification profiles, the gates, and the release gate.

6. **Performance metrics carry three values** — Provisional Target, Measured Baseline, Certified Threshold — and only the Certified Threshold is binding.

7. **ADR lifecycle is formalized** — Draft, Accepted, Superseded, Deprecated — with a mandatory header recording Dependencies, Superseded ADRs, Affected Engines, and Affected Milestones.

8. **The constitution is frozen at v2.0.0.** No architectural change may occur except through a numbered ADR. Implementation begins only after M0 — Architecture Conformance and Certification — completes successfully.

## Consequences

**Positive.** One authority for architecture; capability claims become falsifiable; per-platform truth is expressible; releases gate on measured evidence rather than judgement; ADR history becomes traceable.

**Costs.** M0 is pure conformance and measurement work with no user-visible output. Every Tier A claim must be re-earned through certification, and some will be demoted until they are. Documentation changes now require ADRs.

**Rejected alternatives.** Keeping the multi-document arrangement (no single authority); provider-name tiers (unfalsifiable and platform-blind); treating the Experience Engine as a domain engine (blurs authority and invites presentation code to hold business state); milestone-embedded test scenarios (results not comparable across releases).

## Compliance

ADR-014 remains binding and unchanged. This ADR adds no capability and permits no mechanism it prohibits.
