/**
 * Sprint H13 — companion extension bridge contract.
 *
 * The rules that decide whether StreamFlow may claim control of a provider's
 * own player. Everything here is pure, so honesty is testable.
 */
import { describe, expect, it } from "vitest";

import {
  EXTENSION_PROTOCOL_VERSION,
  EXTENSION_SOURCE,
  isBridgeControllable,
  isExtensionMessage,
  isPlayerStateFresh,
  watchProviderById,
  withExtensionControl,
  type ExtensionPlayerState,
} from "@/domain";

const NOW = 1_700_000_000_000;

function state(overrides: Partial<ExtensionPlayerState> = {}): ExtensionPlayerState {
  return {
    provider: "netflix",
    url: "https://www.netflix.com/watch/1",
    paused: false,
    ended: false,
    positionMs: 12_000,
    durationMs: 3_600_000,
    rate: 1,
    buffering: false,
    title: "A Title",
    episode: null,
    tabId: 3,
    observedAtMs: NOW,
    ...overrides,
  };
}

describe("extension message guard", () => {
  it("accepts only our own protocol", () => {
    expect(
      isExtensionMessage({ source: EXTENSION_SOURCE, v: EXTENSION_PROTOCOL_VERSION, kind: "state" }),
    ).toBe(true);
    expect(isExtensionMessage({ source: "someone-else", v: 1, kind: "state" })).toBe(false);
    expect(isExtensionMessage({ source: EXTENSION_SOURCE, v: 99, kind: "state" })).toBe(false);
    expect(isExtensionMessage(null)).toBe(false);
  });
});

describe("freshness", () => {
  it("rejects a stale report", () => {
    expect(isPlayerStateFresh(state(), NOW)).toBe(true);
    expect(isPlayerStateFresh(state({ observedAtMs: NOW - 30_000 }), NOW)).toBe(false);
    expect(isPlayerStateFresh(null, NOW)).toBe(false);
  });
});

describe("controllability", () => {
  it("requires a connected bridge, the right provider, and a live player", () => {
    expect(
      isBridgeControllable({ status: "connected", providerId: "netflix", state: state(), nowMs: NOW }),
    ).toBe(true);
    expect(
      isBridgeControllable({ status: "installed", providerId: "netflix", state: state(), nowMs: NOW }),
    ).toBe(false);
    expect(
      isBridgeControllable({ status: "connected", providerId: "hotstar", state: state(), nowMs: NOW }),
    ).toBe(false);
    expect(
      isBridgeControllable({ status: "connected", providerId: "netflix", state: null, nowMs: NOW }),
    ).toBe(false);
  });
});

describe("capability upgrade", () => {
  const netflix = watchProviderById("netflix");

  it("stays launch-only without an attached bridge", () => {
    expect(netflix).not.toBeNull();
    expect(withExtensionControl(netflix!, false).playbackControlMode).toBe("launch-only");
  });

  it("becomes automatic only while the bridge is attached", () => {
    const upgraded = withExtensionControl(netflix!, true);
    expect(upgraded.playbackControlMode).toBe("automatic");
    expect(upgraded.requiresOwnSubscription).toBe(true);
    expect(upgraded.allowsFullscreenFromRoom).toBe(false);
    expect(upgraded.limitations.join(" ")).toContain("own");
  });
});
