/**
 * H11.2 — live-flow verification matrix.
 *
 * Walks the host and the guest through a whole session on two providers that
 * sit at opposite ends of the capability range: Netflix (launch-only, nothing
 * embeds, nothing is controlled) and a direct source (automatic, embedded).
 * Each step asserts what the person on the screen is actually offered, so a
 * regression shows up as a wrong next step rather than a wrong internal flag.
 */
import { describe, expect, it } from "bun:test";

import { watchProviderById } from "@/domain/watch/watch-source";
import { deriveStageView } from "@/features/theater/stage-view";

const netflix = watchProviderById("netflix")!;
const direct = watchProviderById("direct")!;

const ottSource = {
  kind: "ott" as const,
  providerId: "netflix",
  titleId: null,
  url: "https://www.netflix.com/browse",
  label: "Netflix",
};

const directSource = {
  kind: "direct" as const,
  providerId: "direct",
  titleId: null,
  url: "https://example.com/clip.mp4",
  label: "Direct link",
};

describe("H11.2 launch-only provider: full host and guest walk", () => {
  it("host: empty stage offers the one primary action", () => {
    const view = deriveStageView({
      source: null,
      capability: netflix,
      isHost: true,
      phase: "lobby",
    });
    expect(view.kind).toBe("empty");
    expect(view.showsChooseCta).toBe(true);
  });

  it("guest: empty stage never offers a host-only action", () => {
    const view = deriveStageView({
      source: null,
      capability: netflix,
      isHost: false,
      phase: "lobby",
    });
    expect(view.kind).toBe("empty");
    expect(view.showsChooseCta).toBe(false);
    expect(view.showsWaitingLine).toBe(true);
  });

  it("host: a selection in flight shows a skeleton, never a blank", () => {
    const view = deriveStageView({
      source: null,
      capability: netflix,
      isHost: true,
      phase: "lobby",
      isPreparing: true,
    });
    expect(view.kind).toBe("preparing");
    expect(view.statusKey.length).toBeGreaterThan(0);
  });

  it("host: after selecting, the stage hands off rather than faking playback", () => {
    const view = deriveStageView({
      source: ottSource,
      capability: netflix,
      isHost: true,
      phase: "selected",
    });
    expect(view.kind).toBe("handoff");
    expect(view.launchKey).toBe("theater.stage.start_party");
  });

  it("guest: before the host launches, the guest is told to wait, not to act blindly", () => {
    const view = deriveStageView({
      source: ottSource,
      capability: netflix,
      isHost: false,
      phase: "selected",
    });
    expect(view.kind).toBe("handoff");
    expect(view.showsMediaCard).toBe(true);
  });

  it("guest: once the host launches, the next step is explicit and joinable", () => {
    const view = deriveStageView({
      source: ottSource,
      capability: netflix,
      isHost: false,
      phase: "selected",
      hostLaunched: true,
    });
    expect(view.statusKey).toBe("theater.stage.status.host_launched");
    expect(view.launchKey).toBe("theater.stage.join_provider");
    expect(view.showsWaitingLine).toBe(false);
  });

  it("both sides see the same countdown stage", () => {
    const host = deriveStageView({
      source: ottSource,
      capability: netflix,
      isHost: true,
      phase: "countdown",
      hasLaunched: true,
    });
    const guest = deriveStageView({
      source: ottSource,
      capability: netflix,
      isHost: false,
      phase: "countdown",
      hasLaunched: true,
      hostLaunched: true,
    });
    expect(guest.kind).toBe(host.kind);
    expect(guest.statusKey).toBe(host.statusKey);
  });

  it("the room ends honestly for both people", () => {
    for (const isHost of [true, false]) {
      const view = deriveStageView({
        source: ottSource,
        capability: netflix,
        isHost,
        phase: "ended",
        hasLaunched: true,
        hostLaunched: true,
      });
      expect(view.statusKey).toBe("theater.stage.status.ended");
    }
  });

  it("the capability record itself forbids every claim the stage could make", () => {
    expect(netflix.playbackControlMode).toBe("launch-only");
    expect(netflix.allowsEmbeddedPlayback).toBe(false);
  });
});

describe("H11.2 stronger-support provider: embedded path stays embedded", () => {
  it("supports automatic control and embedding", () => {
    expect(direct.playbackControlMode).toBe("automatic");
    expect(direct.allowsEmbeddedPlayback).toBe(true);
  });

  it("host and guest both get the embedded stage, not a handoff", () => {
    for (const isHost of [true, false]) {
      const view = deriveStageView({
        source: directSource,
        capability: direct,
        isHost,
        phase: "selected",
      });
      expect(view.kind).toBe("embedded");
    }
  });

  it("an empty embedded-capable room still splits host and guest correctly", () => {
    expect(
      deriveStageView({ source: null, capability: direct, isHost: true, phase: "lobby" })
        .showsChooseCta,
    ).toBe(true);
    expect(
      deriveStageView({ source: null, capability: direct, isHost: false, phase: "lobby" })
        .showsChooseCta,
    ).toBe(false);
  });

  it("never degrades into an empty stage once a source exists", () => {
    for (const phase of ["selected", "countdown", "watching"] as const) {
      for (const isHost of [true, false]) {
        const view = deriveStageView({
          source: directSource,
          capability: direct,
          isHost,
          phase,
        });
        expect(view.kind).not.toBe("empty");
      }
    }
  });
});
