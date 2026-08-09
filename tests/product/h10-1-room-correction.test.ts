/**
 * Room correction pass — behavioural regressions.
 *
 * These tests exist because the live app behaved like a launcher grid with
 * room chrome: a Netflix room offered seventeen services, an external launch
 * left the stage empty, and an abandoned lobby kept advertising itself as
 * something to continue. Each rule below is the corrected behaviour.
 */
import { describe, expect, it } from "bun:test";

import {
  BLOCKED_PROVIDER_KEYS,
  deriveRoomScope,
  isBlockedProviderKey,
  resolveWatchProviderId,
  WATCH_PROVIDERS,
} from "@/domain/watch";
import {
  classifyRoomActivity,
  DORMANT_AFTER_MS,
  DORMANT_EMPTY_AFTER_MS,
  isResumableActivity,
} from "@/domain/rooms/room-activity";
import { deriveStageView } from "@/features/theater/stage-view";

const NOW = Date.parse("2026-08-10T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const capability = (overrides: Record<string, unknown> = {}) =>
  ({
    providerId: "netflix",
    displayName: "Netflix",
    playbackControlMode: "manual",
    allowsEmbeddedPlayback: false,
    selectionMode: "browse",
    limitations: [],
    ...overrides,
  }) as never;

describe("YouTube's return as a controllable source", () => {
  it("no longer blocks the youtube key", () => {
    expect(BLOCKED_PROVIDER_KEYS).not.toContain("youtube");
    expect(isBlockedProviderKey("youtube")).toBe(false);
    expect(resolveWatchProviderId("youtube")).toBe("youtube");
  });

  it("carries youtube as a source the room actually drives", () => {
    const youtube = WATCH_PROVIDERS.find((p) => p.providerId === "youtube");
    expect(youtube).toBeDefined();
    expect(youtube?.playbackControlMode).toBe("automatic");
    expect(youtube?.allowsEmbeddedPlayback).toBe(true);
  });

  // The blocklist machinery stays honest even with nothing on it.
  it("still refuses an unknown service", () => {
    expect(resolveWatchProviderId("not-a-service")).toBeNull();
  });
});


describe("provider scope in a scoped room", () => {
  it("offers exactly one service when the room was created for a service", () => {
    const scope = deriveRoomScope({ scopeKey: "netflix", mediaRef: null });
    expect(scope.isScoped).toBe(true);
    expect(scope.providerId).toBe("netflix");
    expect(scope.providers).toHaveLength(1);
  });

  it("reconciles catalog keys with watch-registry ids", () => {
    expect(resolveWatchProviderId("prime_video")).toBe("prime");
    expect(resolveWatchProviderId("disney_hotstar")).toBe("hotstar");
    expect(resolveWatchProviderId("sony_liv")).toBe("sonyliv");
  });

  it("lets the room's own selection win over the creation key", () => {
    const scope = deriveRoomScope({
      scopeKey: "netflix",
      mediaRef: { providerId: "prime", url: "https://primevideo.com", title: null } as never,
    });
    expect(scope.providerId).toBe("prime");
  });

  it("falls back to the full registry only for an unscoped room", () => {
    const scope = deriveRoomScope({ scopeKey: null, mediaRef: null });
    expect(scope.isScoped).toBe(false);
    expect(scope.providers.length).toBe(WATCH_PROVIDERS.length);
  });
});

describe("stage transitions", () => {
  it("shows a prepared skeleton instead of a blank panel", () => {
    const view = deriveStageView({
      source: null,
      capability: capability(),
      isHost: true,
      phase: "waiting-for-content",
      isPreparing: true,
    });
    expect(view.kind).toBe("preparing");
    expect(view.showsChooseCta).toBe(false);
    expect(view.statusKey).toBe("theater.stage.status.preparing");
  });

  it("becomes an honest handoff after an external launch", () => {
    const view = deriveStageView({
      source: { kind: "external", providerId: "netflix", url: "https://netflix.com" } as never,
      capability: capability(),
      isHost: true,
      phase: "content-selected",
      hasLaunched: true,
    });
    expect(view.kind).toBe("handoff");
    expect(view.statusKey).toBe("theater.stage.status.launched");
  });

  it("never claims embedded playback for a manual service", () => {
    const view = deriveStageView({
      source: { kind: "direct", providerId: "netflix", url: "https://netflix.com" } as never,
      capability: capability({ allowsEmbeddedPlayback: false }),
      isHost: false,
      phase: "watching",
    });
    expect(view.kind).toBe("handoff");
  });

  it("keeps the host CTA away from guests", () => {
    const guest = deriveStageView({
      source: null,
      capability: capability(),
      isHost: false,
      phase: "waiting-for-content",
    });
    expect(guest.showsChooseCta).toBe(false);
    expect(guest.showsWaitingLine).toBe(true);
  });
});

describe("dormant and resumable rooms", () => {
  it("treats a long-idle solo lobby as dormant", () => {
    const activity = classifyRoomActivity({
      status: "lobby",
      hasMedia: true,
      memberCount: 1,
      updatedAt: ago(DORMANT_AFTER_MS + 1_000),
      now: NOW,
    });
    expect(activity).toBe("dormant");
    expect(isResumableActivity(activity)).toBe(false);
  });

  it("goes dormant sooner when nothing was ever chosen", () => {
    expect(
      classifyRoomActivity({
        status: "lobby",
        hasMedia: false,
        memberCount: 1,
        updatedAt: ago(DORMANT_EMPTY_AFTER_MS + 1_000),
        now: NOW,
      }),
    ).toBe("dormant");
  });

  it("never calls a room with company dormant", () => {
    expect(
      classifyRoomActivity({
        status: "lobby",
        hasMedia: false,
        memberCount: 3,
        updatedAt: ago(DORMANT_AFTER_MS * 4),
        now: NOW,
      }),
    ).toBe("live");
  });

  it("keeps an active room resumable regardless of idle time", () => {
    expect(
      classifyRoomActivity({
        status: "active",
        hasMedia: true,
        memberCount: 1,
        updatedAt: ago(DORMANT_AFTER_MS * 10),
        now: NOW,
      }),
    ).toBe("live");
  });

  it("classifies ended and abandoned rooms as closed", () => {
    for (const status of ["ended", "abandoned"] as const) {
      expect(
        classifyRoomActivity({
          status,
          hasMedia: true,
          memberCount: 2,
          updatedAt: ago(1_000),
          now: NOW,
        }),
      ).toBe("closed");
    }
  });
});
