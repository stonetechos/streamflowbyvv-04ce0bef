/**
 * Netflix content script.
 *
 * Observes the page's own <video> element and applies transport commands to
 * it. Nothing here touches DRM, decrypts, records, or proxies anything: these
 * are the same DOM calls the page's own controls make, on the viewer's device,
 * inside the viewer's own authenticated session.
 */

const PROTOCOL_VERSION = 1;
const REPORT_INTERVAL_MS = 500;

let port = null;
let timer = null;
let lastSignature = "";

function connect() {
  try {
    port = chrome.runtime.connect({ name: "netflix-player" });
    port.onDisconnect.addListener(() => {
      port = null;
      setTimeout(connect, 2000);
    });
  } catch {
    port = null;
  }
}

function activeVideo() {
  const videos = Array.from(document.querySelectorAll("video"));
  // The playing element wins; otherwise the longest one, which is the feature.
  const playing = videos.find((video) => !video.paused && video.readyState > 2);
  if (playing) return playing;
  return videos.sort((a, b) => (b.duration || 0) - (a.duration || 0))[0] ?? null;
}

function readTitle() {
  const node =
    document.querySelector('[data-uia="video-title"]') ||
    document.querySelector(".video-title") ||
    null;
  if (!node) return { title: null, episode: null };
  const lines = node.innerText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return { title: lines[0] ?? null, episode: lines.length > 1 ? lines.slice(1).join(" · ") : null };
}

function report() {
  const video = activeVideo();
  if (!video || !port) return;
  const meta = readTitle();
  const state = {
    provider: "netflix",
    url: location.href,
    paused: video.paused,
    ended: video.ended,
    positionMs: Math.round((video.currentTime || 0) * 1000),
    durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : null,
    rate: video.playbackRate || 1,
    buffering: video.readyState < 3,
    title: meta.title,
    episode: meta.episode,
  };
  // Position always moves, so send on a fixed cadence but skip identical rows.
  const signature = `${state.paused}|${state.rate}|${state.title}|${state.buffering}`;
  const changed = signature !== lastSignature;
  lastSignature = signature;
  if (!changed && state.paused && !state.ended) return;
  port.postMessage({ v: PROTOCOL_VERSION, kind: "state", state });
}

function apply(command) {
  const video = activeVideo();
  if (!video) return;
  switch (command.kind) {
    case "play":
      if (typeof command.positionMs === "number") {
        const target = command.positionMs / 1000;
        if (Math.abs(video.currentTime - target) > 1.5) video.currentTime = target;
      }
      void video.play().catch(() => undefined);
      break;
    case "pause":
      if (typeof command.positionMs === "number") video.currentTime = command.positionMs / 1000;
      video.pause();
      break;
    case "seek":
      video.currentTime = Math.max(0, command.positionMs / 1000);
      break;
    case "rate":
      if (command.rate > 0) video.playbackRate = command.rate;
      break;
    default:
      break;
  }
  report();
}

connect();
if (port) {
  port.onMessage.addListener((message) => {
    if (!message || message.v !== PROTOCOL_VERSION) return;
    if (message.kind === "command") apply(message.command);
  });
}

timer = setInterval(() => {
  if (!port) return;
  const video = activeVideo();
  if (!video) return;
  port.postMessage({
    v: PROTOCOL_VERSION,
    kind: "state",
    state: {
      provider: "netflix",
      url: location.href,
      paused: video.paused,
      ended: video.ended,
      positionMs: Math.round((video.currentTime || 0) * 1000),
      durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : null,
      rate: video.playbackRate || 1,
      buffering: video.readyState < 3,
      ...readTitle(),
    },
  });
}, REPORT_INTERVAL_MS);

window.addEventListener("pagehide", () => {
  if (timer) clearInterval(timer);
  try {
    port?.disconnect();
  } catch {
    /* the port is already gone */
  }
});
