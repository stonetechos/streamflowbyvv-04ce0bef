# H13 — Netflix Companion Extension Spike Report

Status: **Runnable now (unpacked, local)** · Scope: **Netflix only** · Sync authority: **unchanged**

## 1. What was built

| # | Deliverable | Location |
| --- | --- | --- |
| 1 | Extension folder | `extension/` |
| 2 | MV3 manifest | `extension/manifest.json` |
| 3 | Message contract | `src/domain/watch/extension-bridge.ts` + `extension/README.md` |
| 4 | Netflix content script | `extension/content/netflix.js` |
| 5 | Service worker | `extension/background/worker.js` |
| 6 | StreamFlow integration | `src/features/theater/use-extension-bridge.ts`, `components/extension-status.tsx`, `theater.tsx` |
| 7 | Test instructions | §4 below and `extension/README.md` |
| 8 | Hardening report | §5 below |
| — | Packaged build | `public/streamflow-netflix-sync.zip` |

## 2. Architecture

No second synchronization system exists. The extension is a **transport**:

```
Netflix tab                Extension                     StreamFlow tab
<video>  ──content script──► service worker ──port──► page bridge ──postMessage──►
                                                        useExtensionBridge
                                                              │
                                          existing useRoomRuntime / watch-sync-service
                                          (revisions, drift bands, host authority)
```

- Host transport actions still go through `useRoomRuntime.send` → `WatchSyncService` → `room_state`.
- Guests still reconcile on the existing 1s loop with the existing `resolveDriftPolicy`
  thresholds; the only change is where `applyRemote` lands.
- `readLocalPositionSeconds` reads the bridge's projected position instead of the
  in-app player when — and only when — the bridge is attached.

## 3. Honesty rule

`withExtensionControl(capability, isControllable)` upgrades Netflix from
`launch-only` to `automatic` **only** while `isBridgeControllable` is true:
bridge connected **and** provider is Netflix **and** a player report is younger
than 6s. Behaviour and on-screen claims flip on the same switch, so ADR-014
still holds everywhere the bridge is not attached. Without the extension the
room falls back to Manual Sync and says so (`theater.extension.missing`).

## 4. Local test instructions

1. `chrome://extensions` → Developer mode → **Load unpacked** → `extension/`.
2. Open a StreamFlow Netflix room. The theatre shows the companion line —
   "Companion connected. Open your Netflix title in another tab."
3. Open the Netflix title in a second tab and press play once so the element exists.
4. The line becomes "StreamFlow is driving Netflix on this device." with the title.
5. As host, use the transport controls: guests running the extension follow.
6. Uninstall or disable the extension → the room returns to Manual Sync wording.

Automated coverage: `tests/product/h13-extension-bridge.test.ts` (5 tests, passing).

## 5. What works vs. what needs hardening

**Works**
- Video detection, play/pause/seek/rate observation and application on watch pages.
- Long-lived port between content script, worker and page; auto-reconnect.
- Freshness gate, provider gate, and honest fallback.
- Title/episode metadata from `[data-uia="video-title"]` when the overlay renders.

**Needs hardening**
- *Origin list is hard-coded* — preview/branch hosts beyond `*.lovable.app` need adding.
- *Metadata is DOM-scraped* — Netflix markup changes will silently drop title/episode.
- *Seek precision* — Netflix re-buffers on seek; the guest's soft-correction band may
  oscillate. A provider-specific cooldown is likely needed.
- *Multiple Netflix tabs* — the freshest report wins; there is no explicit tab pick.
- *No signed distribution* — unpacked only; Web Store review of host permissions is untested.
- *Rate control* — Netflix may clamp `playbackRate`; treat soft nudges as best-effort.
- *No extension-side auth* — any page on a listed origin can talk to the bridge; a
  room-scoped token should be added before public release.
