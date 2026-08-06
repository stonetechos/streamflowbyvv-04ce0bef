# C2 — Experience Engine

Part of the StreamFlow v2.0 Architecture Constitution v2.0.0.

## C2.1 Classification — this is not a Domain Engine

StreamFlow has **13 Domain Engines** (Room, Timeline, Watch Party, Sync, Voice, Chat, Presence, Provider, Notification, Community, AI/Po, Analytics, Moderation). They own business capabilities.

The **Experience Engine is a cross-cutting presentation-support subsystem.** It sits in the Presentation layer, is consumed by every surface, and is deliberately excluded from the domain engine count. Wherever earlier drafts said "the 14 engines", read: 13 Domain Engines plus the Experience Engine as a supporting subsystem.

## C2.2 What it owns

| Area | Scope |
|---|---|
| Motion | Timing curves, durations, choreography, reduced-motion behaviour |
| Animation | Transitions, reveals, reaction bursts, countdown motion, boot animation |
| Accessibility | Focus order, roles and labels, contrast, target sizes, screen-reader semantics, keyboard paths, WCAG 2.1 AA conformance |
| Onboarding | First-run guidance, progressive disclosure, contextual coaching |
| Loading | Skeletons, optimistic affordances, latency masking, timeout presentation |
| Empty states | Zero-data surfaces and their single next action |
| Delight | Haptics, sound cues, micro-interactions, celebratory moments |
| Visual consistency | Design tokens, brand tiles, spacing rhythm, typography scale, elevation, theming |

## C2.3 What it explicitly does not own

The Experience Engine owns **no**:

- business state
- playback authority
- room authority
- synchronization authority
- permissions or authorization decisions
- domain decisions of any kind

It never decides *whether* something may happen, *when* a room advances, *who* may act, or *what* the truth is. It decides only how truth already produced by a Domain Engine is presented and felt.

Prohibited patterns:

- Reading or writing room, sync, presence, or voice state directly.
- Holding a copy of domain state to "smooth" a transition into something the domain has not asserted (this would violate P1 — never fake synchronization).
- Gating an action on a presentation condition.
- Importing repository or infrastructure modules.

## C2.4 Contract shape

The Experience Engine exposes presentation primitives only. Illustrative, vendor-neutral shapes:

```ts
interface MotionProfile { readonly duration: number; readonly easing: string; readonly reducedMotion: boolean }
interface ExperienceSurface {
  motion(intent: MotionIntent): MotionProfile
  haptic(intent: HapticIntent): void
  announce(message: LocalizedMessage, politeness: 'polite' | 'assertive'): void
  loadingState(kind: LoadingKind): LoadingPresentation
  emptyState(kind: EmptyKind): EmptyPresentation
}
```

All inputs are intents and already-localized messages. No domain entities cross the boundary.

## C2.5 Existing implementation mapping

| Concern | Current modules |
|---|---|
| Tokens, brand tiles, theming | `src/styles.css`, brand token set, `sf-brand-tile` |
| Boot and logo motion | `src/features/shared/boot-screen.tsx` |
| Reactions and bursts | `src/features/watch-party/components/reaction-burst.tsx` |
| Countdown presentation | `src/features/waiting-room` countdown surfaces |
| Voice dock presentation | `src/features/voice/components/voice-dock.tsx` |
| Navigation chrome and safe areas | `src/features/navigation` |
| Localization surface | `src/domain/services/localization-service.ts` (consumed, not owned) |

Localization strings are owned by the Localization capability; the Experience Engine consumes them and owns their *presentation*.

## C2.6 Degraded-mode responsibilities

When a Domain Engine reports degradation, the Experience Engine is responsible for the announcement's clarity, placement, motion, and accessibility — never for the decision to degrade or the fallback logic itself.

## C2.7 Certification

The Experience Engine owns the accessibility and motion certification rows in [K](./K-launch-certification.md), and co-owns every row's user-visible assertion. It never owns a functional or realtime row alone.
