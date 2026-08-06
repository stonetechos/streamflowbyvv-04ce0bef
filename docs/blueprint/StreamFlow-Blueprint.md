# StreamFlow v2.0 Architecture Constitution

**Version: 2.0.0 — FROZEN**
Owner: Vedora Vision · Status: Accepted · Supersedes: nothing (extends Foundation Spec v1.0, MVP Functional Spec v1.0, Database Spec v1.0)

From this version onward, **no architectural change may occur except through a numbered ADR** in `docs/adr/`. Implementation begins only after the **M0 — Architecture Conformance and Certification** milestone completes successfully.

---

## Executive Summary

**What StreamFlow is.** StreamFlow is a social watch-party platform. Two to eight people in a private room start something together, talk while it plays, and stay together when the network misbehaves. The product is the room, not the catalogue. StreamFlow never hosts, proxies, re-encodes, or redistributes content; every participant plays from their own account on their own device.

**The hard constraint.** ADR-014 is binding: premium OTT services (Netflix, Prime Video, Disney+, and peers) cannot be programmatically controlled from a browser or a compliant mobile app. DRM, platform sandboxing, and terms of service all forbid it. Any product claim of "we sync Netflix playback" would be either false or built on a prohibited mechanism. StreamFlow makes neither choice.

**How the product still works.** Synchronization is expressed in three capability tiers, and — this is the core amendment of v2.0.0 — **tiers describe capabilities, never brands**:

- **Tier A** — verified controllable playback for one specific `source + adapter + platform + version` combination, evidenced by a certification record. A provider name never qualifies on its own; the same provider can be Tier A on one platform and Tier C on another.
- **Tier B** — an observable but uncontrollable media session; StreamFlow reports position and assists, it does not command.
- **Tier C** — deep link, shared countdown, voice, and coordinated manual playback. Honest, universal, and the default.

Everything the user sees discloses which tier they are in. StreamFlow never fakes synchronization.

**How the system is organized.** Thirteen **Domain Engines** own business capabilities: Room, Timeline, Watch Party, Sync, Voice, Chat, Presence, Provider, Notification, Community, AI/Po, Analytics, Moderation. A fourteenth subsystem, the **Experience Engine**, is explicitly *not* a domain engine — it is a cross-cutting presentation-support layer owning motion, accessibility, onboarding, loading and empty states, delight, and visual consistency, and owning no business state or authority of any kind. Engines are an organizing model inside the Domain layer; the Presentation → Feature → Domain → Repository → Infrastructure layering from Foundation Spec v1.0 is unchanged, and no vendor type (Supabase, LiveKit) appears in any engine contract.

**How quality is enforced.** `K-launch-certification.md` is the Definition of Done. Every capability has a matrix row with thirteen mandatory columns, and every row is exercised under named, reusable **certification profiles** (Normal Network, High Latency, Packet Loss, Temporary Disconnect, Background/Foreground, Late Join, Leave/Rejoin, Host Disconnect, Member Disconnect). Milestones reference profiles; they never hardcode scenarios. Performance metrics carry three values — Provisional Target, Measured Baseline, Certified Threshold — and only the Certified Threshold gates a release. Provisional targets are design intent and are never presented as production commitments.

**What is already built.** Auth and profiles, friends and invitations, home and the service shelf, lobby and waiting room, QR and link invites, the countdown runtime, LiveKit voice, presence, the room lifecycle, the provider launcher and tier model, Po's brain, notifications, and the design language all exist and are production-certified at v1.0. v2.0.0 reorganizes and governs that work; it does not redesign it.

**What happens next.** M0 freezes this constitution, verifies that the shipped code conforms to the engine map, defines the certification profiles, measures real baselines for every performance metric, and populates the certification matrix. Only then does M1 begin.

---

## Chapters

| # | Document | Purpose |
|---|---|---|
| A | [Product Operating Brief](./A-product-operating-brief.md) | Thesis, users, sync tier model, room lifecycle, KPIs/SLOs, Launch Envelope |
| B | [Capability Matrix](./B-capability-matrix.md) | Source × adapter × platform × version × tier, fallback and disclosure |
| C | [Engine Architecture Pack](./C-engine-pack.md) | The 13 Domain Engines, one spec format |
| C2 | [Experience Engine](./C2-experience-engine.md) | Cross-cutting presentation-support subsystem |
| C3 | [State Management Principles](./C3-state-management.md) | Persistent, realtime, session, cached, derived, offline |
| C4 | [Performance Budget](./C4-performance-budget.md) | Provisional Target / Measured Baseline / Certified Threshold |
| C5 | [Product Principles](./C5-product-principles.md) | Immutable principles as architecture constraints |
| D | [Milestone Delivery Roadmap](./D-milestone-roadmap.md) | M0–M7 |
| E | [Scope Decisions](./E-scope-decisions.md) | Remove / defer / accept risk / non-negotiable |
| F | [Reality Check](./F-reality-check.md) | Hearo-like viability under ADR-014 |
| G | [Platform Foundation](./G-platform-foundation.md) | Shared Vedora Vision capabilities |
| H | [Native Architecture](./H-native-architecture.md) | Core Domain vs platform adapters |
| I | [Governance](./I-governance.md) | Engineering constitution and ADR lifecycle |
| J | [Technical Debt Register](./J-technical-debt.md) | Immediate / near-term / long-term |
| K | [Launch Certification](./K-launch-certification.md) | Definition of Done, matrix, profiles, gates |
| ADR-015 | [Engine Decomposition](./ADR-015-engine-decomposition.md) | Makes the engine model binding |

## Reading order

Product and leadership: Executive Summary → A → F → D → K.
Engineering: A → B → C → C2–C5 → H → I → K.
Certification and release: K → C4 → B → D.
