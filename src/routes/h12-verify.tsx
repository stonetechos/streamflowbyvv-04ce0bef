/**
 * TEMPORARY verification harness — Sprint H12 evidence capture only.
 * Renders the shipped TheaterBox against a local direct video so real browser
 * behaviour can be measured without an authenticated room. Deleted after the
 * verification run; it changes no shipped implementation code.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { TheaterBox } from "@/features/theater/components/theater-box";
import { useDirectPlayer } from "@/features/theater/use-direct-player";

export const Route = createFileRoute("/h12-verify")({
  head: () => ({ meta: [{ title: "H12 verification harness" }, { name: "robots", content: "noindex" }] }),
  component: Harness,
});

function Harness() {
  const [url, setUrl] = useState<string | null>("/__h12-verify.mp4");
  const player = useDirectPlayer({ url });

  const togglePlay = useCallback(() => {
    if (player.state.isPaused) player.play();
    else player.pause();
  }, [player]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">H12 verification harness</h1>
      <TheaterBox
        player={player}
        title="Verification clip"
        canControlTransport
        onTogglePlay={togglePlay}
        onSeekTo={(ms) => player.seekTo(ms)}
        onSeekBy={(delta) => player.seekTo((player.positionMs() ?? 0) + delta)}
        onRestart={() => {
          player.seekTo(0);
          player.play();
        }}
        onRetry={() => setUrl("/__h12-verify.mp4")}
      />
      <div className="flex gap-2">
        <button type="button" data-h12="break-source" onClick={() => setUrl("/__h12-missing.mp4")}>
          Break source
        </button>
        <button type="button" data-h12="fix-source" onClick={() => setUrl("/__h12-verify.mp4")}>
          Fix source
        </button>
      </div>
    </main>
  );
}
