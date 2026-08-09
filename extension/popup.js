const port = chrome.runtime.connect({ name: "streamflow-app" });
const dot = document.getElementById("dot");
const label = document.getElementById("label");

port.onMessage.addListener((message) => {
  if (!message) return;
  if (message.kind === "ready" || message.kind === "state") {
    const live = Boolean(message.hasPlayerTab);
    dot.className = live ? "dot on" : "dot";
    label.textContent = live
      ? message.state?.title
        ? `Watching: ${message.state.title}`
        : "Netflix tab connected"
      : "No Netflix tab open";
  }
});

port.postMessage({ v: 1, kind: "poll" });
