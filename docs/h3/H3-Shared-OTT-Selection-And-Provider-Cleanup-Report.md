# H3 — Shared OTT Selection and Provider Cleanup Report

Status: Implemented
Scope: Product implementation (Sprint H3). No architecture change, no schema change, no certification-semantics change.
Constitutional basis: ADR-014 (no OTT playback control), Foundation §11 (no credentials, no proxying), Build Rules §1 (Domain decides, Presentation renders).

## 1. Defects addressed

### BUG 1 — OTT title selection was effectively host-private

Root cause (repository truth):

- `useWatchSource` performed its own `WatchSourceService.read(roomId)` and refreshed only when its
  `revision` input changed. The Theater passed `revision: room.members.length`, so a selection change
  produced no revision change and no re-read for guests.
- The lobby surfaces (`now-watching-card.tsx`, `provider-session-card.tsx`) read
  `room.contentReference` (share-intake state), while the Theater read
  `room.metadata['watch_source']` (host selection state). Two different fields described "what are we
  watching", so a host selection never appeared in the lobby and read as "no service chosen yet".

Resolution: the selection is now a single shared room-state value, `RoomMediaRef`, carried on the room
snapshot every participant already re-reads on each realtime notice.

### BUG 2 — YouTube present across product surfaces

YouTube was a first-class provider in the watch registry, the home service shelf, the landing page mark
row, the deep-link registry and service, manual-sync guidance, share intake aliases, the service logo
table, brand tokens, the Po lexicon, and both localization bundles. All product-visible entries are
removed; the embedded YouTube IFrame player is deleted.

## 2. Shared state model

`RoomMediaRef` (`src/domain/watch/watch-source.ts`):

| Field | Meaning |
| --- | --- |
| `providerId` | Stable service key (`netflix`, `prime`, `hotstar`, `disney`, `jiocinema`, `sonyliv`, `zee5`, `appletv`, `direct`) |
| `providerName` | Display name, read from the capability model — never hand-written in a screen |
| `kind` | `ott` \| `direct` \| `external` |
| `url` | Public title/page URL, or the direct file URL |
| `titleId` | The service's own public title id when the link carried one |
| `title` | Host-typed title, optional |
| `selectedAt` | ISO timestamp of the decision |

Persistence: written by `WatchSourceService.set` to the room aggregate metadata under `watch_media`
(JSON), with the legacy `watch_source` / `watch_title` keys kept in step. `readRoomMediaRef` resolves
legacy-only rooms, so rooms selected before H3 still render.

Propagation path (unchanged transport, no new subscription):

```text
host saves -> rooms.update(metadata) -> room row change
  -> room realtime hub notice -> useWaitingRoom re-read
  -> snapshot.room.metadata -> toRoomSummary -> RoomSummaryView.mediaRef
  -> lobby cards + Theater + MediaCard + WatchStage
```

Because the value lives on the snapshot, guests, late joiners, and reconnecting participants read it on
their first load with no extra request. The host sees an optimistic echo of a save that retires as soon
as the snapshot carries the same URL, so host and guests converge on one answer.

## 3. Standardized selection flow (all services)

Every OTT service uses the identical three-step handoff, driven by `selectionMode: "browse"`:

1. Pick the service in the provider bar; StreamFlow opens that service's public browse URL.
2. Choose the title there, in the viewer's own browser and own account.
3. Return and paste the public title link (plus an optional title); the room stores a `RoomMediaRef`.

`direct` (a directly reachable video file) uses `selectionMode: "paste-link"` and is the only source
StreamFlow embeds and drives, through the browser's own `<video>` element
(`src/features/theater/use-direct-player.ts`).

## 4. Truthfulness posture

- All eight OTT services are `playback-control-mode: launch-only`, `allowsEmbeddedPlayback: false`,
  `requiresOwnSubscription: true`. Their stated limitations are generated from one function, so no screen
  can describe one service more generously than another.
- The Theater renders `HostTransport` only when the source is embeddable; every other source gets the
  `CoordinationPanel`, which offers an open-link and a re-sync prompt and no fake transport.
- No scraping, no credential capture, no protection bypass, no partner API. ADR-014 remains intact.

## 5. Files changed

Domain
- `src/domain/watch/watch-source.ts` — rewritten: multi-OTT registry, `ott`/`direct`/`external` source
  kinds, `RoomMediaRef` with serialization and legacy fallback, YouTube removed.
- `src/domain/watch/watch-source-service.ts` — writes/clears the shared `watch_media` reference.
- `src/domain/watch/index.ts` — export surface updated.
- `src/domain/providers/deep-link-registry.ts`, `deep-link-service.ts`, `manual-sync-guidance.ts`,
  `shared-content.ts` — YouTube entries removed.

Presentation
- `src/features/waiting-room/waiting-room.types.ts`, `waiting-room-state.ts` — `RoomSummaryView.mediaRef`.
- `src/features/waiting-room/components/now-watching-card.tsx`, `provider-session-card.tsx` — render the
  shared reference first, share-intake reference as fallback.
- `src/features/theater/use-watch-source.ts` — snapshot-driven; write path only.
- `src/features/theater/use-direct-player.ts` — new HTML5 player; `use-youtube-player.ts` deleted.
- `src/features/theater/theater.tsx`, `components/source-picker.tsx`, `components/watch-stage.tsx`,
  `components/coordination-panel.tsx`, `index.ts` — generalized to the new source kinds.
- `src/features/home/service-shelf.ts`, `components/service-logo.tsx`, `src/routes/index.tsx`,
  `src/features/share/use-share-intake.ts`, `src/features/po/brain/po-lexicon.ts`, `src/styles.css`,
  both localization bundles — YouTube removed; Netflix-specific copy generalized to `{provider}`.

Not changed: schema, migrations, CI workflows, certification evidence, registries under `docs/registry/`.

## 6. Verification

| Check | Result |
| --- | --- |
| `tsgo --noEmit` | Pass |
| `npm run lint` | Pass for all H3-touched files (one pre-existing formatting error remains in `tests/certification/provider/m1-provider-disclosure.spec.ts`, untouched by this sprint) |
| `node scripts/check-architecture.mjs` | Pass — no vendor leakage outside Infrastructure |
| Dev server | Serves 200 |
| YouTube references in `src/` | Only four explanatory code comments remain; zero registry, UI, copy, or runtime entries |

Certification status is unchanged by this sprint: no row is claimed, measured, or re-sealed here.
