# H4 — Multi-OTT Functional Validation and Watch-Party Start Flow

Status: complete (product development sprint)
Mode: BUILD MODE — product code only. No certification was run, no certification
evidence was written, no M1/M2 work was started, and YouTube was not reinstated.

---

## 1. Current provider registry

Single source of truth: `src/domain/watch/watch-source.ts`.
Exports: `WATCH_PROVIDERS` (enabled and lobby-visible, in display order) and
`WATCH_PROVIDER_DEFINITIONS` (everything the product knows, enabled or not).
Every product-visible provider surface renders from this registry only:

| Surface | File | Source |
| --- | --- | --- |
| Room provider bar | `src/features/theater/components/provider-bar.tsx` | `WATCH_PROVIDERS` |
| Source picker | `src/features/theater/components/source-picker.tsx` | passed capability record |
| Media card | `src/features/theater/components/media-card.tsx` | passed capability record + `RoomMediaRef` |
| Watch stage | `src/features/theater/components/watch-stage.tsx` | passed capability record |
| Coordination panel | `src/features/theater/components/coordination-panel.tsx` | passed capability record |

The definition shape now carries the full H4 contract:

```ts
type ProviderDefinition = {
  providerId; displayName; enabled; visibleInLobby; supported;
  selectionMode: "browse" | "paste-link" | "direct-title" | "direct-link";
  playbackControlMode: "automatic" | "assisted" | "manual" | "launch-only" | "unavailable";
  allowsEmbeddedPlayback; allowsFullscreenFromRoom; allowsZoomFromRoom;
  requiresOwnSubscription; requiresProviderLogin;
  supportedPlatforms: string[]; limitations: string[];
};
```

## 2. Provider capability matrix

All values verified programmatically against the registry (§10, row group A).

| providerId | Display name | enabled | visibleInLobby | selectionMode | playbackControlMode | embed | fullscreen | zoom | subscription | provider login | platforms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| netflix | Netflix | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| prime | Prime Video | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| hotstar | JioHotstar | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| disney | Disney+ | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| jiocinema | JioCinema | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| sonyliv | Sony LIV | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| zee5 | ZEE5 | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| appletv | Apple TV+ | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| hbo_max | HBO Max | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| hulu | Hulu | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| peacock | Peacock | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| paramount_plus | Paramount+ | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| crunchyroll | Crunchyroll | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| google_drive | Google Drive | yes | yes | browse | launch-only | no | no | no | yes | yes | web-desktop, web-mobile |
| direct | Direct video link | yes | yes | direct-link | automatic | yes | yes | no | no | no | web-desktop, web-mobile |

Deliberately absent, and why:

- **YouTube** — removed in H3, not re-added (explicit H4 constraint).
- **Starz, Twitch** — not present in any repository registry or shelf today; a
  provider is not added because a competitor markets it.
- **local/demo source** — no local-file picker exists in the product. Locally
  hosted media is reachable through `direct` when the URL is openly reachable.
- Six brands (HBO Max, Hulu, Peacock, Paramount+, Crunchyroll, Google Drive)
  were already named on the home service shelf but had no room flow. H4 gives
  them the same honest launch-only flow so the host is not sent to a dead end.
- `google_drive` inherits the conservative OTT defaults, including
  `requiresOwnSubscription: true`. Read as "everyone needs their own access to
  the file"; the value is deliberately conservative, never permissive.

Unknown services (`unknownProviderCapability`) are `enabled: false`,
`visibleInLobby: false`, `playbackControlMode: "unavailable"` — described
honestly, never offered as a tab.

## 3. Selection flow

One flow, all providers.

1. **Choose provider** — host taps a chip in the provider bar. The chip prints
   the display name and the capability mode translated from
   `playbackControlMode`; the picker prints the subscription requirement and
   the limitation list. A `browse`-mode provider opens its public entry point
   in a new tab when nothing has been chosen yet.
2. **Select content** — `browse`/`direct-title` providers get the "come back
   with the title link" handoff; `direct-link` gets a media URL field.
3. **Normalize** — `parseWatchSource` attributes the URL to a provider only
   when the hostname genuinely belongs to it, extracts the public title id
   where the path carries one, and otherwise describes the link as external.
   `toRoomMediaRef` then stamps `selectionMode`, `syncMode`,
   `selectedByParticipantId`, `selectedAtServerMs`, `validity`, `limitations`.
4. **Persist** — `WatchSourceService.set` enforces host-only authorship, writes
   the reference onto the room aggregate metadata, and the room revision and
   realtime snapshot carry it to everyone.
5. **Render** — every client reads `RoomSummaryView.mediaRef` from the snapshot.

## 4. Shared `RoomMediaRef` behavior

```ts
type RoomMediaRef = {
  providerId; providerName; kind; url; titleId; title; selectedAt;
  selectionMode; syncMode; selectedByParticipantId; selectedAtServerMs;
  validity: "valid" | "pending" | "needs-user-action" | "invalid";
  limitations: string[];
};
```

- Written once, on the room, by the host; read identically by host, guest, late
  joiner, and reconnecting member through `readRoomMediaRef(room.metadata)` in
  `waiting-room-state.ts`.
- The host's optimistic echo is retired as soon as the snapshot carries the
  saved choice, so the snapshot always wins.
- Rows written before H4, and rows written against a service the product no
  longer offers, are normalized on read: capability fields are refilled from the
  registry and an unknown provider resolves to `validity: "invalid"`.

## 5. Countdown and start behavior

- Host button states, `data-sf-start-state`: `ready` → "Start the party",
  `invalid` → "Fix selection", `empty` → "Select content" (disabled).
- The countdown itself is unchanged frozen runtime: `CountdownCoordinator`
  writes a server-side target, `use-room-countdown` projects the remaining
  seconds from that shared target, so every client counts the same 5→1.
- `deriveRoomPhase` produces the shared phase from state everyone already has:
  `waiting-for-content | content-selected | countdown | watching | paused |
  ended | closed`. Rendered as `data-sf-phase` on the theater screen and
  `data-sf-room-phase` on the media card.

## 6. Control behavior by capability

| Mode | Providers | What the room renders |
| --- | --- | --- |
| automatic | direct | Real transport (`HostTransport`): host play/pause/seek broadcast, guests reconcile drift, late/reconnecting clients seek to the shared target |
| assisted | none today | Reserved; nothing claims it |
| manual | none today | Reserved; nothing claims it |
| launch-only | all 14 OTT entries | `CoordinationPanel` only: "Open provider", re-sync nudge, countdown instruction. No play/pause/seek control is rendered |
| unavailable | unknown links | Coordination copy only |

No transport control is rendered for any provider StreamFlow does not drive.

## 7. Guest, late-join, and reconnect behavior

- Guest before selection: media card prints "Waiting for the host to choose
  content" (`theater.media.guest_waiting`); the stage prints the empty state.
- Guest after selection: same media card, same provider, same title, same
  capability lines, same countdown — all from the snapshot.
- Late joiner: receives the current snapshot on first load, so provider, title,
  phase and countdown are already correct; for `direct` sources the player
  seeks to the room's target position on readiness.
- Reconnecting member: the realtime hub re-reads the snapshot, restoring
  provider, title, phase and sync mode.
- Stale provider: the card shows the migration line and the host's button reads
  "Fix selection". The provider is never silently converted.

## 8. Volume, fullscreen, orientation, zoom

- **Volume** — local React state applied to the local element only, marked
  `data-sf-volume-scope="device"`, never broadcast, never stored in
  `RoomMediaRef`, and only shown when there is a player to apply it to.
- **Fullscreen** — offered only when `allowsEmbeddedPlayback &&
  allowsFullscreenFromRoom` (i.e. `direct`). Every OTT shows
  "Use {provider}'s own fullscreen control." instead.
- **Orientation** — landscape lock is attempted only after a successful
  fullscreen request and its failure is swallowed; the room is never blocked.
- **Zoom** — `allowsZoomFromRoom` is `false` everywhere and no zoom control
  exists in any component. Nothing simulates zoom.

## 9. YouTube removal verification

`rg -i "youtube" src/` returns matches in exactly three files, none of which is
product-visible provider surface:

- `src/domain/providers/provider.types.ts` — doc comment example of a key.
- `src/domain/providers/capability-certification.ts` — doc comment examples.
- `src/infrastructure/providers/browser-provider-launcher.ts` — comment.

Verified absent from: watch registry, room provider bar, source picker,
placeholder map, home service shelf, create-room and lobby surfaces, capability
matrix, fallback defaults, seeded/demo data, route-level lists, and in-memory
initializers. A pre-existing room whose stored reference names YouTube resolves
to `validity: "invalid"` and a migration prompt (validated in §10, row A14).

## 10. Functional test matrix

Group A — registry and shared-state contract. Executed as a product-development
script over the real domain modules (`bun /tmp/h4check.ts`, 57 assertions,
0 failures). This is product validation, not certification evidence.

| # | Check | Result |
| --- | --- | --- |
| A1 | 15 enabled providers exposed, in display order | PASS |
| A2 | No YouTube in the enabled registry | PASS |
| A3 | All 14 OTT entries are launch-only, no embed/fullscreen/zoom, subscription + login required | PASS |
| A4 | `direct` exposes no zoom | PASS |
| A5–A8 | Every OTT browse URL parses back to its own providerId (14 providers) | PASS |
| A9 | `toRoomMediaRef` stamps validity, syncMode, selector id, server ms, limitations (14 providers) | PASS |
| A10 | JSON round-trip through room metadata preserves provider, title, validity (14 providers) | PASS |
| A11 | Direct link parses as `direct` with `automatic` sync mode | PASS |
| A12 | Netflix public title id extracted from a title URL | PASS |
| A13 | Non-URL input yields no false provider attribution | PASS |
| A14 | Stored YouTube reference resolves to `invalid` and phase `waiting-for-content` | PASS |
| A15 | Phase derivation for empty/selected/countdown/watching/paused/ended | PASS |

Group B — UI and realtime paths, verified by code-path review against the
snapshot contract (single-render inspection; no multi-client session was
driven, because that would be a certification run).

| # | Check | Result |
| --- | --- | --- |
| B1 | Host and guest render from the same `RoomSummaryView.mediaRef` | VERIFIED (single source in `waiting-room-state.ts`) |
| B2 | Selection reaches guests through the existing realtime snapshot | VERIFIED (no host-private selection state remains) |
| B3 | Late joiner and reconnecting member read the same snapshot | VERIFIED |
| B4 | Countdown projected from the server-written target on every client | VERIFIED (frozen countdown runtime, unchanged) |
| B5 | Launch-only providers render no transport control | VERIFIED |
| B6 | Volume never leaves the device | VERIFIED |
| B7 | Fullscreen offered only for the embedded player | VERIFIED |
| B8 | Invalid selection surfaces "Fix selection" plus migration copy | VERIFIED |
| B9 | Multi-client timing behaviour under real network | NOT EXECUTED — belongs to certification, deliberately out of H4 scope |

Repository checks: `tsgo --noEmit` clean, `npm run arch:check` passed, lint
clean for all files touched by this sprint.

## 11. Known provider limitations

- No OTT service can be played, paused, or seeked by StreamFlow (ADR-014). The
  strongest action available is opening a public URL in the member's browser.
- Every OTT participant needs their own account and their own login; StreamFlow
  stores no provider credentials and circumvents no protection.
- Title metadata is limited to what a public URL carries: provider, title id
  where the path exposes one, and a host-typed name. No artwork source exists
  yet, so `artworkUrl` is not populated by any provider.
- `assisted` and `manual` modes are modelled but unused; nothing claims them.
- Drift reconciliation exists only for `direct` sources.

## 12. Next recommended product milestone

**H5 — Room lifecycle persistence and rejoin polish.** Persist the derived room
phase and the countdown outcome on the room aggregate (today the phase is
derived per client from durable inputs), add an explicit "Join current party"
action for late joiners, and add a per-participant readiness signal for
launch-only rooms so the host can see who has actually pressed play in their
own provider app.
