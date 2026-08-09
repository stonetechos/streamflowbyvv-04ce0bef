/**
 * StreamFlow Sync — background service worker (MV3).
 *
 * The only job here is relaying. Two kinds of long-lived ports connect:
 *
 *   "netflix-player" — one per Netflix tab. Sends player state, receives commands.
 *   "streamflow-app" — one per StreamFlow tab. Receives state, sends commands.
 *
 * No synchronization logic lives in the extension. StreamFlow's room sync
 * service stays the single authority; this worker never decides anything.
 */

const PROTOCOL_VERSION = 1;
/** A report older than this is not worth forwarding as "live". */
const STALE_AFTER_MS = 6000;

/** @type {Map<number, chrome.runtime.Port>} */
const netflixPorts = new Map();
/** @type {Set<chrome.runtime.Port>} */
const appPorts = new Set();
/** Latest player report, keyed by tab id. */
const lastState = new Map();

function freshestState() {
  let best = null;
  for (const state of lastState.values()) {
    if (!state) continue;
    if (Date.now() - state.observedAtMs > STALE_AFTER_MS) continue;
    if (!best || state.observedAtMs > best.observedAtMs) best = state;
  }
  return best;
}

function broadcastState() {
  const state = freshestState();
  const message = {
    v: PROTOCOL_VERSION,
    kind: "state",
    hasPlayerTab: netflixPorts.size > 0,
    state,
  };
  for (const port of appPorts) {
    try {
      port.postMessage(message);
    } catch {
      appPorts.delete(port);
    }
  }
}

function sendCommand(command) {
  // Prefer the tab that produced the freshest report; otherwise any tab.
  const state = freshestState();
  const target =
    (state && netflixPorts.get(state.tabId)) || netflixPorts.values().next().value || null;
  if (!target) return false;
  try {
    target.postMessage({ v: PROTOCOL_VERSION, kind: "command", command });
    return true;
  } catch {
    return false;
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "netflix-player") {
    const tabId = port.sender?.tab?.id ?? -1;
    netflixPorts.set(tabId, port);
    port.onMessage.addListener((message) => {
      if (!message || message.v !== PROTOCOL_VERSION) return;
      if (message.kind === "state") {
        lastState.set(tabId, { ...message.state, tabId, observedAtMs: Date.now() });
        broadcastState();
      }
    });
    port.onDisconnect.addListener(() => {
      netflixPorts.delete(tabId);
      lastState.delete(tabId);
      broadcastState();
    });
    broadcastState();
    return;
  }

  if (port.name === "streamflow-app") {
    appPorts.add(port);
    port.postMessage({ v: PROTOCOL_VERSION, kind: "ready", hasPlayerTab: netflixPorts.size > 0 });
    port.onMessage.addListener((message) => {
      if (!message || message.v !== PROTOCOL_VERSION) return;
      if (message.kind === "command") {
        const delivered = sendCommand(message.command);
        port.postMessage({
          v: PROTOCOL_VERSION,
          kind: "ack",
          id: message.id ?? null,
          delivered,
        });
      }
      if (message.kind === "poll") broadcastState();
    });
    port.onDisconnect.addListener(() => appPorts.delete(port));
    broadcastState();
  }
});
