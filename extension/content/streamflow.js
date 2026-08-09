/**
 * StreamFlow page bridge.
 *
 * Runs on StreamFlow origins only and relays between the page's
 * `window.postMessage` channel and the extension service worker. The page
 * never gets extension APIs; the extension never gets page scope.
 */

const PROTOCOL_VERSION = 1;
const APP_SOURCE = "streamflow-app";
const EXT_SOURCE = "streamflow-extension";

let port = null;

function toPage(message) {
  window.postMessage({ ...message, source: EXT_SOURCE, v: PROTOCOL_VERSION }, window.location.origin);
}

function connect() {
  try {
    port = chrome.runtime.connect({ name: "streamflow-app" });
  } catch {
    port = null;
    toPage({ kind: "gone" });
    return;
  }
  port.onMessage.addListener((message) => {
    if (!message || message.v !== PROTOCOL_VERSION) return;
    toPage(message);
  });
  port.onDisconnect.addListener(() => {
    port = null;
    toPage({ kind: "gone" });
  });
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== APP_SOURCE || data.v !== PROTOCOL_VERSION) return;

  if (data.kind === "hello") {
    if (!port) connect();
    toPage({ kind: "installed", version: chrome.runtime.getManifest().version });
    port?.postMessage({ v: PROTOCOL_VERSION, kind: "poll" });
    return;
  }
  if (data.kind === "command") {
    if (!port) connect();
    port?.postMessage({ v: PROTOCOL_VERSION, kind: "command", id: data.id ?? null, command: data.command });
  }
});

connect();
// The page may load after this script; announce presence once it is ready.
toPage({ kind: "installed", version: chrome.runtime.getManifest().version });
document.addEventListener("DOMContentLoaded", () =>
  toPage({ kind: "installed", version: chrome.runtime.getManifest().version }),
);
