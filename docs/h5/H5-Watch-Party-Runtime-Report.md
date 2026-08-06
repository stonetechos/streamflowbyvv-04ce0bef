# H5 — Watch-Party Runtime Report

Sprint: H5 — Watch-Party Runtime, Countdown, Sync Controls, and Room UX
Mode: BUILD
Scope: room runtime only. No certification was run, no certification evidence
was written, no M1/M2 work was started, no provider scope changed, YouTube was
not reintroduced.

H4 is preserved: the provider registry, the 15 enabled entries, launch-only OTT
classification, `RoomMediaRef` as shared snapshot state, and `RoomPhase` are all
unchanged in meaning. H5 builds the runtime on top of them.

---

## 1. Runtime architecture

The room is split along a single line and the code follows it.

```text
CONTROL PLANE (this application)
  domain/watch/room-runtime.ts     rules: state, revisions, authority, drift,
                                   readiness, events, coordination
  domain/watch/watch-sync-service  authority: dispatch, revision assignment
  features/theater/use-room-runtime  client: apply newer revisions, project
                                   position, reconcile only automatic sources
  features/theater/use-room-chat   chat + durable coordination requests
  features/waiting-room/*          presence, membership, server-timed countdown

MEDIA PLANE (the provider)
  playback itself, provider auth, subtitles, audio tracks, device volume,
  provider-native fullscreen, provider-native zoom, DRM
```

Nothing in the control plane claims to reach the media plane for a launch-only
provider. For those providers the runtime issues no transport command, computes
no drift, and applies no correction.

New files:

| File | Role |
| --- | --- |
| `src/domain/watch/room-runtime.ts` | All H5 rules, pure and testable |
| `src/features/theater/use-room-runtime.ts` | Client runtime and reconciliation |
| `src/features/theater/runtime-telemetry.ts` | Development counters and drift stats |
| `src/features/theater/components/manual-coordination.tsx` | Launch-only controls |
| `src/features/theater/components/participant-rail.tsx` | Presence and readiness |
| `src/features/theater/components/room-drawer.tsx` | Mobile chat/people sheet |
| `tests/product/h5-room-runtime.test.ts` | 24 product tests |

`components/coordination-panel.tsx` was replaced by `manual-coordination.tsx`.

---

## 2. Authoritative playback state

```ts
type PlaybackState = {
  status: "idle" | "countdown" | "playing" | "paused" | "seeking"
        | "buffering" | "ended" | "manual-sync";
  positionSeconds: number;
  anchorServerTimeMs: number;
  playbackRate: number;
  revision: number;
  changedByParticipantId?: string;
  changedAtServerMs: number;
};
```

It is derived from the durable `room_state` row; `revision` is that row's
version, which the database increments under an optimistic-concurrency compare.

Every explicit command — play, pause, seek, restart, start-countdown,
finish-countdown — goes through `WatchSyncService.dispatch`, which:

1. validates permissions (`authorizeCommand`: host, room open, media present
   and valid, control mode actually automatic for transport commands);
2. performs a revision-checked write, so a losing writer is rejected rather
   than merged;
3. stamps server time and the acting participant;
4. persists and broadcasts;
5. returns `{ outcome: "applied" | "rejected", ... }` to the caller.

Clients apply a state only when `isFreshRevision(applied, incoming)` — strictly
greater. Anything else is dropped and counted as `revision.stale.rejected`.

Position while playing is computed from the anchor, not from a local clock:
`positionSeconds + (serverNow - anchorServerTimeMs) * rate`, where `serverNow`
is the device clock plus the measured clock offset from the existing clock-sync
subsystem. No individual client clock is trusted raw.

---

## 3. Countdown behaviour

The countdown remains the existing server-timed implementation (`useRoomCountdown`
over the durable countdown row) and H5 consumes it rather than duplicating it.
Start requires valid media and an open room; the runtime reports `countdown` as
the playback status for the whole room while it runs, so host and guests render
the same phase.

- Joining mid-countdown: remaining time is computed from the shared start
  instant and duration, so the countdown is never restarted for a late arrival.
- Expiring while disconnected: the reconnecting client receives the current
  phase from the snapshot, not a replayed countdown, and lands in the
  "party already started" path with manual catch-up for launch-only providers.

---

## 4. Automatic sources

Only sources with `playbackControlMode === "automatic"` — today the direct-video
provider, played in our own HTML5 player — get transport controls and drift
correction. `resolveDriftPolicy` returns `null` for every other mode, and a null
policy is the switch that disables the whole correction path.

Default policy (configurable per adapter):

| Band | Threshold | Action |
| --- | --- | --- |
| Ignore | < 150 ms | nothing |
| Soft | 150–1000 ms | playback rate nudge to 1.05 |
| Hard | > 1000 ms | seek to the projected position |
| Suppressed | buffering, or < 1500 ms since a seek | nothing |

Host commands update the authoritative state; guests reconcile once per second
against the projected position; the host re-anchors every 10 s while playing so
a late joiner never inherits stale arithmetic.

---

## 5. Launch-only OTT sources

For Netflix, Disney+, Prime Video, Max, Hulu, and the rest of the launch-only
set the room shows `ManualCoordination` and nothing that resembles a transport:

- Open provider (opens the selected title or the provider's browse page)
- I'm ready / Not ready yet
- Request pause
- Request resume
- Ask everyone to re-sync (host)
- Leave party
- Re-sync instructions in plain language

A request is a durable room message addressed to people. It is broadcast, shown
to everyone, and never mutates playback state. The room never renders "all
devices paused", because it cannot verify it. Sync status for these rooms reads
"Manual sync" — a mode, not a degraded measurement.

---

## 6. Late join and reconnect

On entry and on every realtime notice the client re-reads the snapshot rather
than trusting a pushed payload: membership and authorization first, then room
snapshot, then playback state, then derived phase and countdown remaining.

- Automatic source: seek to the projected authoritative position when the
  player is ready.
- Launch-only source: show title, provider and manual catch-up instructions. No
  provider is opened without a deliberate tap.

Stale local state is never resumed; the local player is reconciled to the room,
never the reverse.

---

## 7. Readiness model

States: `joined`, `selecting`, `ready`, `watching`, `reconnecting`,
`disconnected`, `left`. They are sourced from presence and from a person's own
"I'm ready" tap — never inferred.

`summarizeReadiness` supports `host-only` (the MVP default), `all-ready`, and
`percentage`. Readiness is visible to everyone; only the threshold differs. The
rail shows "2 of 3 ready" and "Waiting for Alex".

---

## 8. Volume, fullscreen, orientation, zoom

| Concern | Behaviour |
| --- | --- |
| Volume | Local only. Never broadcast, never in playback state, never shared. |
| Fullscreen | Offered only for the embedded player we control; launch-only rooms point at the provider's own control. |
| Orientation | Landscape is requested after fullscreen and failure is ignored; playback is never blocked on it. |
| Zoom | Not exposed. No adapter reports zoom support, so no control is rendered and none is simulated. |

---

## 9. Observability

Development-only, in-memory, discarded on unmount. No provider credentials,
cookies, or protected content are touched.

Counters: room join success/failure, countdown start success/failure, reconnect
recovered, stale revision rejected, sync correction, readiness completed,
provider launch success, room closed, chat send failed.

Derived metrics for automatic sources: mean absolute drift, maximum absolute
drift, corrections per minute, selection-to-start duration, reconnect catch-up
duration.

---

## 10. Test results

`bun run test:product` — **24 passed, 0 failed, 51 assertions.**

Covered: phase transitions (waiting → content-selected → countdown → watching →
paused → ended, closed outranking everything); revision freshness and stale
discard; stale state-changing events; host permission and guest rejection;
closed-room rejection; launch-only transport refusal; countdown media validity;
position projection for playing, paused and late-joining clients; every drift
band including buffering and post-seek suppression; readiness counting and all
three thresholds; coordination metadata round-trip; YouTube absence; Netflix
remaining launch-only with no drift policy.

Also run: `tsc --noEmit` clean, `eslint` 0 errors, architecture guard passed.

**Not run:** the Playwright certification harness. No certification evidence was
created, per the sprint's explicit prohibition. Browser-level UI verification
was limited to a smoke load of the app with zero console errors.

---

## 11. Status classification

**Implemented (application-controlled)**
Authoritative playback state with revisions; permission-checked dispatch; stale
rejection; server-time position projection; shared server-timed countdown;
drift correction for automatic sources; late-join and reconnect recovery;
readiness model; chat and coordination requests; participant rail; desktop and
mobile room layouts; local volume; development telemetry.

**Simulated / coordination-only**
Pause, resume and re-sync requests for launch-only providers. These are messages
to humans. Readiness is self-declared. The room asserts nothing about a device
it cannot observe.

**Provider-native**
Playback, authentication, subtitles, audio tracks, fullscreen and zoom inside
Netflix, Disney+, Prime Video, Max, Hulu and every other launch-only service.

**Unavailable**
Automatic play/pause/seek for launch-only providers; verified pause
acknowledgement; zoom control; any per-device confirmation that a provider
actually paused.

---

## 12. Known limitations

1. Only one adapter is automatic today (direct video), so the drift path has
   one real consumer; thresholds are configurable but only exercised by tests.
2. Readiness is self-declared and resets on reload — it is not durable state.
3. Coordination requests ride the room message channel; there is no separate
   durable event table, so they age out with chat history.
4. Countdown authority remains the pre-existing countdown row rather than the
   playback row; the two are consistent but not a single write.
5. Drift statistics are in-memory and per-session only.
6. Orientation lock is best-effort; iOS Safari and desktop browsers refuse it.

---

## 13. Next milestone

The runtime is usable. The next natural step is durable room events (replacing
the message-channel coordination carrier) and persistent readiness, followed by
whatever certification authorization decides about the frozen M1 prerequisites.
No certification work was started here.
