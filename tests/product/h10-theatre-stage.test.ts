/**
 * Theatre stage tests — centre panel as the room's primary watch surface.
 *
 * Covers the role split in the empty state, the transition into the chosen
 * content state, launch-only honesty, and the removal of the duplicate
 * "nothing chosen" surface.
 */
import { describe, expect, test } from "bun:test";

import { parseWatchSource, watchProviderById, watchSourceCapability } from "@/domain";
import { deriveStageView } from "@/features/theater/stage-view";

const NONE = watchProviderById("netflix")!;
const emptyCapability = watchSourceCapability(null);

describe("theatre stage empty state", () => {
  test("gives the host an actionable choose-content CTA", () => {
    const view = deriveStageView({
      source: null,
      capability: emptyCapability,
      isHost: true,
      phase: "waiting-for-content",
    });
    expect(view.kind).toBe("empty");
    expect(view.role).toBe("host");
    expect(view.showsChooseCta).toBe(true);
    expect(view.showsWaitingLine).toBe(false);
  });

  test("gives a guest a waiting state and no host-only action", () => {
    const view = deriveStageView({
      source: null,
      capability: emptyCapability,
      isHost: false,
      phase: "waiting-for-content",
    });
    expect(view.kind).toBe("empty");
    expect(view.role).toBe("guest");
    expect(view.showsChooseCta).toBe(false);
    expect(view.showsWaitingLine).toBe(true);
  });

  test("does not duplicate the empty state in the lower media card", () => {
    for (const isHost of [true, false]) {
      const view = deriveStageView({
        source: null,
        capability: emptyCapability,
        isHost,
        phase: "waiting-for-content",
      });
      expect(view.showsMediaCard).toBe(false);
    }
  });
});

describe("theatre stage selected content", () => {
  test("replaces the empty state for host and guest alike once content is chosen", () => {
    const source = parseWatchSource("https://www.netflix.com/title/81234567");
    expect(source).not.toBeNull();
    const capability = watchSourceCapability(source);

    for (const isHost of [true, false]) {
      const view = deriveStageView({
        source,
        capability,
        isHost,
        phase: "content-selected",
      });
      expect(view.kind).not.toBe("empty");
      expect(view.showsChooseCta).toBe(false);
      expect(view.showsWaitingLine).toBe(false);
      expect(view.showsMediaCard).toBe(true);
    }
  });

  test("never claims embedded playback for a launch-only service", () => {
    for (const key of ["netflix", "jiotv", "mxplayer", "discovery_plus"]) {
      const provider = watchProviderById(key);
      expect(provider, key).not.toBeUndefined();
      const source = {
        kind: "provider" as const,
        providerId: key,
        url: `https://example.com/${key}`,
        titleId: null,
      };
      const capability = watchSourceCapability(source as never);
      const view = deriveStageView({
        source: source as never,
        capability,
        isHost: true,
        phase: "content-selected",
      });
      expect(capability.allowsEmbeddedPlayback, key).toBe(false);
      expect(view.kind, key).toBe("handoff");
    }
  });

  test("plays inline only for a directly reachable file", () => {
    const source = parseWatchSource("https://example.com/clip.mp4");
    expect(source?.kind).toBe("direct");
    const capability = watchSourceCapability(source);
    const view = deriveStageView({ source, capability, isHost: true, phase: "watching" });
    expect(capability.allowsEmbeddedPlayback).toBe(true);
    expect(view.kind).toBe("embedded");
  });

  test("carries a phase-specific status line", () => {
    const source = parseWatchSource("https://www.netflix.com/title/81234567");
    const capability = watchSourceCapability(source);
    expect(
      deriveStageView({ source, capability, isHost: true, phase: "countdown" }).statusKey,
    ).toBe("theater.stage.status.countdown");
    expect(deriveStageView({ source, capability, isHost: true, phase: "watching" }).statusKey).toBe(
      "theater.stage.status.watching",
    );
  });
});

describe("provider registry sanity", () => {
  test("still resolves a known provider", () => {
    expect(NONE.providerId).toBe("netflix");
  });
});
