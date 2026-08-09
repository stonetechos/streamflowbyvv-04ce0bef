/**
 * TEMPORARY verification harness — Sprint H12.1. Deleted after evidence capture.
 * Mounts the shipped TheaterBox against a local fixture so captions and every
 * Picture-in-Picture capability branch can be exercised in a real browser.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { TheaterBox } from "@/features/theater/components/theater-box";
import { useDirectPlayer, type TextTrackSource } from "@/features/theater/use-direct-player";
import {
  __setPipSupportOverride,
  type PipSupport,
} from "@/features/theater/use-picture-in-picture";

export const Route = createFileRoute("/h12-verify")({ component: Harness });

const GOOD = "/__h12-verify.webm";
const CAPTIONED: readonly TextTrackSource[] = [
  { src: "/__h12-verify.en.vtt", srclang: "en", label: "English" },
  { src: "/__h12-verify.hi.vtt", srclang: "hi", label: "हिन्दी" },
];
const NONE: readonly TextTrackSource[] = [];

function Harness() {
  const [url, setUrl] = useState<string>(GOOD);
  const [tracks, setTracks] = useState<readonly TextTrackSource[]>(CAPTIONED);
  const [support, setSupport] = useState<PipSupport | null>(null);
  const player = useDirectPlayer({ url, textTracks: tracks });

  const applySupport = (value: PipSupport | null) => {
    __setPipSupportOverride(value);
    setSupport(value);
    // Remount the box so the capability effect re-reads detection.
    setUrl((current) => current);
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">H12.1 harness</h1>
      <div className="flex flex-wrap gap-2 text-sm">
        <button type="button" data-h="captioned" onClick={() => setTracks(CAPTIONED)}>
          Captioned source
        </button>
        <button type="button" data-h="uncaptioned" onClick={() => setTracks(NONE)}>
          No-track source
        </button>
        <button type="button" data-h="pip-document" onClick={() => applySupport("document")}>
          Force document PiP
        </button>
        <button type="button" data-h="pip-element" onClick={() => applySupport("element")}>
          Force element PiP
        </button>
        <button type="button" data-h="pip-none" onClick={() => applySupport("none")}>
          Force no PiP
        </button>
        <button type="button" data-h="pip-real" onClick={() => applySupport(null)}>
          Real detection
        </button>
        <span data-h="override">{support ?? "real"}</span>
      </div>
      <TheaterBox
        key={`${support ?? "real"}`}
        player={player}
        title="H12 fixture"
        canControlTransport
        onTogglePlay={() => (player.state.isPaused ? player.play() : player.pause())}
        onSeekTo={(ms) => player.seekTo(ms)}
        onSeekBy={(delta) => player.seekTo(player.state.positionMs + delta)}
        onRestart={() => {
          player.seekTo(0);
          player.play();
        }}
        onRetry={() => setUrl(GOOD)}
      />
    </main>
  );
}
