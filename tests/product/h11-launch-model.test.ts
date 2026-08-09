/**
 * H11 — Hearo-style launch model.
 *
 * The rules this sprint corrected, asserted where they are decided: a scoped
 * room is that service's room, a launch is a room fact both sides see, and a
 * quiet lobby stops being offered as "continue watching" after five minutes.
 */
import { describe, expect, it } from "bun:test";

import {
  DORMANT_AFTER_MS,
  DORMANT_EMPTY_AFTER_MS,
  classifyRoomActivity,
} from "@/domain/rooms/room-activity";
import { deriveRoomScope } from "@/domain/watch/room-scope";
import { watchProviderById } from "@/domain/watch/watch-source";
import { deriveStageView } from "@/features/theater/stage-view";

const netflix = watchProviderById("netflix")!;

const ottSource = {
  kind: "ott" as const,
  providerId: "netflix",
  titleId: null,
  url: "https://www.netflix.com/browse",
  label: "Netflix",
};

describe("dormancy is five minutes, not thirty", () => {
  const base = {
    status: "lobby" as const,
    memberCount: 1,
    now: Date.parse("2026-01-01T00:10:00.000Z"),
  };

  it("uses a five-minute threshold for a room that chose something", () => {
    expect(DORMANT_AFTER_MS).toBe(5 * 60 * 1000);
    expect(DORMANT_EMPTY_AFTER_MS).toBe(2 * 60 * 1000);
  });

  it("marks a six-minute-old solo lobby dormant", () => {
    expect(
      classifyRoomActivity({
        ...base,
        hasMedia: true,
        updatedAt: "2026-01-01T00:04:00.000Z",
      }),
    ).toBe("dormant");
  });

  it("keeps a fresh solo lobby live", () => {
    expect(
      classifyRoomActivity({
        ...base,
        hasMedia: true,
        updatedAt: "2026-01-01T00:07:00.000Z",
      }),
    ).toBe("live");
  });
});

describe("a scoped room offers one service", () => {
  it("resolves a catalog key to exactly one provider", () => {
    const scope = deriveRoomScope({ scopeKey: "netflix", mediaRef: null });
    expect(scope.isScoped).toBe(true);
    expect(scope.providers).toHaveLength(1);
    expect(scope.providerId).toBe("netflix");
  });

  it("never resolves a service the product doesn't carry", () => {
    expect(deriveRoomScope({ scopeKey: "not-a-service", mediaRef: null }).isScoped).toBe(false);
  });

});

describe("the stage leads with starting the party", () => {
  it("offers to start the party before anything is opened", () => {
    const view = deriveStageView({
      source: ottSource,
      capability: netflix,
      isHost: true,
      phase: "selected",
    });
    expect(view.kind).toBe("handoff");
    expect(view.launchKey).toBe("theater.stage.start_party");
  });

  it("offers a way back once this person has opened it", () => {
    const view = deriveStageView({
      source: ottSource,
      capability: netflix,
      isHost: true,
      phase: "selected",
      hasLaunched: true,
    });
    expect(view.launchKey).toBe("theater.stage.reopen_provider");
    expect(view.statusKey).toBe("theater.stage.status.launched");
  });

  it("tells a guest the host has already opened it", () => {
    const view = deriveStageView({
      source: ottSource,
      capability: netflix,
      isHost: false,
      phase: "selected",
      hostLaunched: true,
    });
    expect(view.statusKey).toBe("theater.stage.status.host_launched");
    expect(view.launchKey).toBe("theater.stage.join_provider");
  });

  it("never blanks while a choice is being written", () => {
    const view = deriveStageView({
      source: null,
      capability: netflix,
      isHost: true,
      phase: "waiting",
      isPreparing: true,
    });
    expect(view.kind).toBe("preparing");
  });
});
