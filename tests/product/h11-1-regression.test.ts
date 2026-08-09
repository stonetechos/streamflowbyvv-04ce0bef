/**
 * H11.1 — regression coverage for the three ways this product has failed before.
 *
 * 1. Scoped-room leakage: a room made from one service offering seventeen.
 * 2. Stale rejoin state: a lobby nobody is in still offered as "continue".
 * 3. Empty stage after launch: the room going blank once the service opens,
 *    especially for a guest who did not press the button themselves.
 */
import { describe, expect, it } from "bun:test";

import {
  classifyRoomActivity,
  isResumableActivity,
  type RoomActivity,
} from "@/domain/rooms/room-activity";
import {
  BLOCKED_PROVIDER_KEYS,
  deriveRoomScope,
  isBlockedProviderKey,
  resolveWatchProviderId,
} from "@/domain/watch/room-scope";
import { WATCH_PROVIDERS, watchProviderById } from "@/domain/watch/watch-source";
import { deriveStageView } from "@/features/theater/stage-view";

const netflix = watchProviderById("netflix")!;
const prime = watchProviderById("prime")!;

const sourceFor = (providerId: string, url: string) => ({
  kind: "ott" as const,
  providerId,
  titleId: null,
  url,
  label: providerId,
});

describe("regression: scoped-room leakage", () => {
  it("never widens a scoped room beyond its one service", () => {
    for (const provider of WATCH_PROVIDERS) {
      const scope = deriveRoomScope({ scopeKey: provider.providerId, mediaRef: null });
      if (!scope.isScoped) continue;
      expect(scope.providers).toHaveLength(1);
      expect(scope.providers[0]?.providerId).toBe(provider.providerId);
    }
  });

  it("scopes through catalog aliases, not just registry ids", () => {
    expect(resolveWatchProviderId("prime_video")).toBe("prime");
    expect(resolveWatchProviderId("disney_hotstar")).toBe("hotstar");
    expect(resolveWatchProviderId("sony_liv")).toBe("sonyliv");
  });

  it("lets the room's own selection win over a stale creation key", () => {
    const scope = deriveRoomScope({
      scopeKey: "netflix",
      mediaRef: {
        providerId: "prime",
        url: "https://www.primevideo.com/",
        title: null,
      } as never,
    });
    expect(scope.providerId).toBe(prime.providerId);
    expect(scope.providers).toHaveLength(1);
  });

  it("never lets a removed service leak back into a room", () => {
    for (const key of BLOCKED_PROVIDER_KEYS) {
      expect(isBlockedProviderKey(key)).toBe(true);
      expect(isBlockedProviderKey(key.toUpperCase())).toBe(true);
      expect(resolveWatchProviderId(key)).toBeNull();
      expect(deriveRoomScope({ scopeKey: key, mediaRef: null }).isScoped).toBe(false);
    }
    expect(WATCH_PROVIDERS.some((p) => isBlockedProviderKey(p.providerId))).toBe(false);
  });

  it("falls back to an open room only when the key is genuinely unknown", () => {
    const scope = deriveRoomScope({ scopeKey: "not_a_service", mediaRef: null });
    expect(scope.isScoped).toBe(false);
    expect(scope.providers.length).toBe(WATCH_PROVIDERS.length);
  });
});

describe("regression: stale rejoin state", () => {
  const now = Date.parse("2026-01-01T01:00:00.000Z");
  const minutesAgo = (n: number) => new Date(now - n * 60_000).toISOString();

  const activityOf = (over: Partial<Parameters<typeof classifyRoomActivity>[0]>): RoomActivity =>
    classifyRoomActivity({
      status: "lobby",
      hasMedia: true,
      memberCount: 1,
      updatedAt: minutesAgo(0),
      now,
      ...over,
    });

  it("stops offering a solo lobby once it is six minutes stale", () => {
    const activity = activityOf({ updatedAt: minutesAgo(6) });
    expect(activity).toBe("dormant");
    expect(isResumableActivity(activity)).toBe(false);
  });

  it("stops offering an empty solo lobby after three minutes", () => {
    expect(activityOf({ hasMedia: false, updatedAt: minutesAgo(3) })).toBe("dormant");
  });

  it("keeps offering a room other people are still in", () => {
    const activity = activityOf({ memberCount: 3, updatedAt: minutesAgo(45) });
    expect(activity).toBe("live");
    expect(isResumableActivity(activity)).toBe(true);
  });

  it("keeps offering a room that is actively watching", () => {
    expect(activityOf({ status: "active", updatedAt: minutesAgo(45) })).toBe("live");
  });

  it("never offers a finished room", () => {
    for (const status of ["ended", "abandoned"] as const) {
      const activity = activityOf({ status, updatedAt: minutesAgo(0) });
      expect(activity).toBe("closed");
      expect(isResumableActivity(activity)).toBe(false);
    }
  });
});

describe("regression: empty stage after launch", () => {
  const source = sourceFor("netflix", "https://www.netflix.com/browse");

  it("never returns an empty stage once the room has a selection", () => {
    for (const isHost of [true, false]) {
      for (const hasLaunched of [true, false]) {
        for (const hostLaunched of [true, false]) {
          const view = deriveStageView({
            source,
            capability: netflix,
            isHost,
            phase: "selected",
            hasLaunched,
            hostLaunched,
          });
          expect(view.kind).toBe("handoff");
          expect(view.showsMediaCard).toBe(true);
          expect(view.statusKey.length).toBeGreaterThan(0);
          expect(view.launchKey.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("gives a guest the host's launch state, not a dead panel", () => {
    const guest = deriveStageView({
      source,
      capability: netflix,
      isHost: false,
      phase: "selected",
      hostLaunched: true,
    });
    expect(guest.statusKey).toBe("theater.stage.status.host_launched");
    expect(guest.launchKey).toBe("theater.stage.join_provider");
    expect(guest.showsWaitingLine).toBe(false);
  });

  it("moves the guest on to their own launched state once they open it too", () => {
    const guest = deriveStageView({
      source,
      capability: netflix,
      isHost: false,
      phase: "selected",
      hasLaunched: true,
      hostLaunched: true,
    });
    expect(guest.statusKey).toBe("theater.stage.status.launched");
    expect(guest.launchKey).toBe("theater.stage.reopen_provider");
  });

  it("lets the room end honestly even after a launch", () => {
    for (const phase of ["ended", "closed"] as const) {
      const view = deriveStageView({
        source,
        capability: netflix,
        isHost: true,
        phase,
        hasLaunched: true,
      });
      expect(view.statusKey).toBe(`theater.stage.status.${phase}`);
    }
  });

  it("shows a countdown-ready guest the same stage as the host", () => {
    const host = deriveStageView({ source, capability: netflix, isHost: true, phase: "countdown" });
    const guest = deriveStageView({
      source,
      capability: netflix,
      isHost: false,
      phase: "countdown",
    });
    expect(guest.kind).toBe(host.kind);
    expect(guest.statusKey).toBe(host.statusKey);
  });
});
