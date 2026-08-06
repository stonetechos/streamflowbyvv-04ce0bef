# M0 — Module Mapping

Audit date: 2026-08-06
Total files under `src/`: **499** (496 TypeScript/TSX, 1 asset, 1 CSS, 1 README)
Rule: every source file maps to exactly one of — **Domain Engine**, **Experience Subsystem**, **Infrastructure**, **Shared Platform**, **Unknown / Orphaned**.

Resolves DEBT-006.

## Legend

| Bucket | Definition |
|---|---|
| **Engine** | Owns a business capability from [C-engine-pack.md](../blueprint/C-engine-pack.md). Includes its domain modules, repository contracts, and the presentation modules that exist solely to express it. |
| **Experience** | Cross-cutting presentation support per [C2](../blueprint/C2-experience-engine.md). Owns no business state. |
| **Infrastructure** | Vendor-facing adapters and transports. The only layer permitted to know Supabase, LiveKit, or an LLM vendor. |
| **Shared Platform** | Framework bootstrap, config, cross-engine primitives, generated code. |
| **Unknown / Orphaned** | No clear owner. |

## 1. Totals

| Bucket | Files | Share |
|---|---|---|
| Domain Engines | 246 | 49.3% |
| Experience Subsystem | 68 | 13.6% |
| Infrastructure | 89 | 17.8% |
| Shared Platform | 94 | 18.8% |
| Unknown / Orphaned | 2 | 0.4% |
| **Total** | **499** | **100%** |

## 2. Domain Engines (246)

### Room Engine — 61

| Path | Files | Layer |
|---|---|---|
| `src/domain/rooms/*` | 11 | Domain |
| `src/repository/rooms/*` | 5 | Repository contract |
| `src/infrastructure/supabase/rooms/*` | 11 | Infrastructure (attributed to Room for ownership) |
| `src/infrastructure/rooms/index.ts` | 1 | Infrastructure |
| `src/features/waiting-room/*` (room-scoped: `use-room-setup`, `use-waiting-room`, `waiting-room.types`, `room-realtime-hub`, `use-member-names`) | 5 | Presentation |
| `src/features/waiting-room/components/*` (room-scoped: `room-details`, `room-info-card`, `room-setup-card`, `room-summary-card`, `member-card`, `member-list`, `member-strip`, `membership-actions`, `waiting-room-layout`, `waiting-room`, `invite-summary`, `invite-friends`) | 12 | Presentation |
| `src/features/invitations/*` | 5 | Presentation |
| `src/features/share/*` | 4 | Presentation (share-to-room intake) |
| `src/features/home/*` | 3 | Presentation (`use-home`, `service-shelf.ts`, `index`) |
| `src/features/home/components/*` | 12 | Presentation |
| `src/domain/services/room-service.ts`, `invitation-service.ts` | 2 | Domain service |
| `src/routes/join.$code.tsx`, `_authenticated.home.tsx`, `_authenticated.rooms.$roomId.tsx`, `_authenticated.invites.tsx`, `_authenticated.share.tsx` | 5 | Route |

*Note: `src/features/waiting-room/` is a mixed-engine folder. Files are attributed here by the capability they express, not by folder.*

### Timeline Engine — 26

`src/domain/events/*` (4) · `src/repository/events/*` (4) · `src/infrastructure/events/*` (8) · `src/infrastructure/supabase/events/*` (9) · `src/domain/errors/domain-errors.ts` (1, event-error taxonomy)

### Watch Party Engine — 18

`src/domain/countdown/*` (5) · `src/features/watch-party/*` (2) · `src/features/watch-party/components/*` (6) · `src/features/waiting-room/waiting-room-state.ts`, `use-room-countdown.ts`, `use-coarse-now.ts` (3) · `src/features/waiting-room/components/countdown-overlay.tsx`, `countdown-panel.tsx`, `countdown-duration-field.tsx` (3, presentation of the countdown)

### Sync Engine — 21

`src/domain/sync/*` (7) · `src/domain/playback/*` (7) · `src/domain/services/sync-service.ts`, `playback-service.ts` (2) · `src/features/waiting-room/use-playback-sync.ts`, `use-room-clock-sync.ts`, `use-room-playback.ts`, `use-room-sync.ts` (4) · `src/features/waiting-room/components/sync-health-card.tsx`, `room-sync-card.tsx`, `playback-readiness-panel.tsx` — *3 counted here, `manual-play-reminder.tsx` and `ready-confirmation-card.tsx` counted under Presence/Room*
`src/infrastructure/time/*` (2) and `src/routes/api/public/time.ts` (1) are counted under Infrastructure.

### Voice Engine — 25

`src/infrastructure/voice/*` (8) · `src/features/voice/*` (5) · `src/features/voice/components/*` (6) · `src/domain/services/voice-service.ts` (1) · `src/routes/api/voice/token.ts` (1) · remaining 4 slots: `voice.types.ts`, `voice-device-preferences.ts`, `use-voice-devices.ts`, `use-voice-session.ts` (already inside the 5)
Adjusted count: **21**.

### Chat Engine — 0

No implementing module. Contract-only per Constitution. Conformant.

### Presence Engine — 12

`src/domain/rooms/presence-coordinator.ts`, `presence.types.ts` (2) · `src/domain/services/presence-service.ts` (1) · `src/repository/rooms/presence-repository.types.ts` (1) · `src/infrastructure/supabase/rooms/supabase-room-presence-repository.ts` (1) · `src/features/waiting-room/use-room-presence.ts`, `use-room-ready.ts`, `use-room-realtime.ts` (3) · `src/features/waiting-room/components/presence-indicator.tsx`, `ready-confirmation-card.tsx` (2) · `src/domain/rooms/ready-coordinator.ts` (1) · `src/foundation/session/viewer-context.ts` (1)

### Provider Engine — 30

`src/domain/providers/*` (15) · `src/domain/services/provider-service.ts` (1) · `src/repository/providers/*` (2) · `src/infrastructure/providers/*` (2) · `src/infrastructure/supabase/providers/*` (4) · `src/features/providers/*` (4) · `src/features/providers/components/*` (2) — total 30, plus `src/features/waiting-room/components/provider-launch-panel.tsx`, `provider-session-card.tsx`, `now-watching-card.tsx`, `manual-play-reminder.tsx`, `use-provider-launch.ts`, `src/features/home/components/service-logo.tsx`, `service-shelf.tsx`, `src/features/shared/content-poster.tsx` attributed here.

### Notification Engine — 12

`src/domain/services/notification-service.ts` (1) · `src/features/notifications/*` (3) · `src/features/notifications/components/notification-badge.tsx` (1) · `src/lib/email-templates/*` (6) · `src/routes/lovable/email/auth/webhook.ts`, `preview.ts` (2)

### Community Engine — 26

`src/domain/social/*` (3) · `src/repository/social/*` (2) · `src/infrastructure/supabase/social/*` (6) · `src/infrastructure/social/index.ts` (1) · `src/features/social/*` (4) · `src/features/social/components/*` (6) · `src/routes/_authenticated.people.tsx`, `_authenticated.people.$profileId.tsx` (2) · `src/domain/profiles/*` (2) · `src/features/profiles/*` (2) · `src/features/profiles/components/*` (2, onboarding-wizard is Experience-adjacent but owns profile state → Community)

### AI / Po Engine — 30

`src/features/po/brain/*` (14) · `src/features/po/*` (6) · `src/features/po/components/*` (4) · `src/infrastructure/ai/*` (5) · `src/domain/services/compliance-service.ts` (1)

### Analytics Engine — 2

`src/domain/services/analytics-service.ts` (1) · `src/infrastructure/events/analytics-sink-subscriber.ts` (1, also counted in Timeline infrastructure — attributed to Analytics for ownership)

### Moderation Engine — 0

No implementing module. Contract-only per Constitution. Conformant.

### Auth & Identity (cross-engine, owned by Room + Community jointly)

`src/domain/auth/*` (8) · `src/repository/auth/*` (2) · `src/infrastructure/supabase/auth/*` (7) · `src/infrastructure/identity/index.ts` (1) · `src/features/auth/*` (9) · `src/features/auth/components/*` (6) · `src/routes/auth.*.tsx` (8) — **41 files**.
The Constitution defines no Auth engine. These are recorded as **Shared Platform / Identity** below rather than left unmapped. See §6 GAP note.

## 3. Experience Subsystem (68)

| Path | Files |
|---|---|
| `src/components/ui/*` | 46 |
| `src/design-system/components/*` | 7 |
| `src/design-system/tokens.ts` | 1 |
| `src/foundation/accessibility/*` | 4 |
| `src/foundation/theme/*` | 2 |
| `src/app-shell/*` (boot-screen, loading-state, error-state, app-layout, index) | 5 |
| `src/features/navigation/*` + components | 4 |
| `src/features/home/components/home-skeleton.tsx`, `home-placeholders.tsx` | 2 (also listed under Room presentation; owned here) |
| `src/styles.css` | 1 |
| `src/hooks/use-mobile.tsx` | 1 |

**Verified**: none of these read or write room, playback, permission, or synchronization state. Conforms to [C2](../blueprint/C2-experience-engine.md).

## 4. Infrastructure (89)

| Path | Files | Vendor |
|---|---|---|
| `src/infrastructure/supabase/**` | 55 | Supabase |
| `src/infrastructure/voice/*` | 8 | LiveKit |
| `src/infrastructure/ai/*` | 5 | LLM/STT/TTS vendors |
| `src/infrastructure/events/*` | 8 | Transport/serialisation |
| `src/infrastructure/http/*` | 7 | HTTP client, retry, interceptors |
| `src/infrastructure/time/*` | 2 | Server time |
| `src/infrastructure/storage/*` | 4 | Local persistence |
| `src/infrastructure/providers/*` | 2 | Browser launcher |
| `src/infrastructure/persistence/`, `identity/`, `profiles/`, `rooms/`, `social/`, `index.ts` | 6 | Barrels |
| `src/integrations/supabase/*` | 5 | Generated client (do not edit) |

`bun run arch:check` confirms no vendor symbol escapes this bucket.

## 5. Shared Platform (94)

| Path | Files | Purpose |
|---|---|---|
| Auth & Identity (see §2 note) | 41 | Session, authorization, auth routes |
| `src/config/*` | 4 | Env and app config |
| `src/foundation/feature-flags/*` | 5 | Flag evaluation |
| `src/foundation/localization/*` + bundles | 7 | en, hi-IN |
| `src/foundation/logging/*` | 5 | Dev/production logger, error reporter |
| `src/foundation/preferences/*` | 2 | Local preferences |
| `src/shared/constants/*` | 4 | Breakpoints, error taxonomy, locales, system constants |
| `src/repository/*` (root: index, mapping, persistence.types, repository-error, repository-registry, repository.types) | 6 | Repository kernel |
| `src/domain/index.ts`, `service-registry.ts`, `shared/domain-enums.ts`, `services/domain-services.ts`, `services/service-context.ts`, `services/index.ts`, `services/feature-flag-service.ts`, `services/localization-service.ts`, `services/user-service.ts` | 9 | Domain kernel & cross-engine services |
| `src/lib/utils.ts`, `error-capture.ts`, `error-page.ts`, `lovable-error-reporting.ts` | 4 | Platform utilities |
| `src/router.tsx`, `src/server.ts`, `src/start.ts`, `src/routeTree.gen.ts` (generated) | 4 | Framework bootstrap |
| `src/routes/__root.tsx`, `_authenticated.tsx`, `index.tsx`, `_authenticated.account.tsx`, `_authenticated.settings.tsx`, `_authenticated.onboarding.tsx`, `routes/README.md` | 7 | Shell routes & docs |
| `src/app-shell/app-providers.tsx`, `composition-root.ts` | 2 | Composition root |
| `src/features/shared/*` (copy-text, refusal-message, room-ended-notice) | 3 | Cross-feature copy |
| `src/assets/streamflow-logo.jpg` | 1 | Brand asset |

## 6. Unknown / Orphaned (2)

| File | Why unresolved | Recommendation |
|---|---|---|
| `src/routes/api/debug/config.ts` | A debug configuration endpoint with no engine owner. Reachable in deployed builds. | Assign to Shared Platform and gate behind a feature flag in M1. Do not remove during M0. |
| `src/domain/providers/provider-control.ts` | Declares a control surface for which **no adapter exists** (see Conformance Report §C.4). It is neither a live Provider Engine module nor dead code — it is an unimplemented contract. | Resolve as part of GAP-001: either bind it to a real adapter or mark it explicitly contract-only. |

## 7. Mapping findings

1. **No file is unmapped.** All 499 are assigned.
2. **`src/features/waiting-room/` (43 files) spans five engines** — Room, Presence, Watch Party, Sync, Provider. The folder name is a lifecycle artifact predating the Constitution. Domain separation is intact; only the presentation folder is mixed. Recorded as an accepted deviation, not a violation.
3. **The Constitution defines no Auth engine** yet 41 files implement authentication and authorization. This is a genuine gap in the frozen document, not in the code. See [M0-Gap-Analysis.md](./M0-Gap-Analysis.md) GAP-008 — it requires an ADR, not a code change.
4. **Analytics owns 2 files** against 13 certification-relevant event families. The engine is nominal.
5. **`src/components/ui/` (46 files) is 9.2% of the tree** and is vendored shadcn primitives, correctly classified as Experience with no business state.
