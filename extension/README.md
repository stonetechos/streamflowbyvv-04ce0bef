# StreamFlow Sync for Netflix — MV3 spike

Netflix-only proof of concept. The extension observes and controls the Netflix
`<video>` element on the viewer's own device and relays that over a long-lived
port to StreamFlow. All synchronization decisions stay in StreamFlow's existing
room sync service; the extension is a transport, not a second sync system.

## Load locally

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this `extension/` folder.
3. Open your StreamFlow room. The theatre shows **Netflix sync connected** once
   the bridge answers.
4. Open a Netflix title in another tab and start playback once.
5. Host transport (play / pause / seek) now drives that Netflix tab, and guests
   with the extension reconcile through the room's existing drift thresholds.

Without the extension nothing changes: the room stays in honest Manual Sync.

## Message contract (protocol v1)

Page → bridge (`window.postMessage`, `source: "streamflow-app"`):
- `{ kind: "hello" }`
- `{ kind: "command", id, command: { kind: "play"|"pause"|"seek"|"rate", positionMs?, rate? } }`

Bridge → page (`source: "streamflow-extension"`):
- `{ kind: "installed", version }`
- `{ kind: "ready" | "state", hasPlayerTab, state }`
- `{ kind: "ack", id, delivered }`
- `{ kind: "gone" }`

`state`: `{ provider, url, paused, ended, positionMs, durationMs, rate, buffering, title, episode, tabId, observedAtMs }`
