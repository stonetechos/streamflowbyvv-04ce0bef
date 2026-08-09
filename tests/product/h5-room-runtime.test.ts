/**
 * H5 room runtime — product tests.
 *
 * These exercise the control plane's rules directly: phases, revisions,
 * permissions, drift bands, countdown projection and readiness. They are
 * product tests, not certification evidence, and write no evidence artifacts.
 */
import { describe, expect, test } from "bun:test";

import {
  DEFAULT_DRIFT_POLICY,
  authorizeCommand,
  classifyDriftCorrection,
  createRoomEvent,
  decodeCoordination,
  deriveRoomPhase,
  emptyPlaybackState,
  encodeCoordination,
  isFreshRevision,
  isStaleEvent,
  isStateChanging,
  projectPositionSeconds,
  reduceState,
  resolveDriftPolicy,
  summarizeReadiness,
  syncStatusFor,
  watchProviderById,
  type ParticipantRuntime,
  type PlaybackState,
  type RoomMediaRef,
} from "@/domain";

const NOW = 1_700_000_000_000;

function media(overrides: Partial<RoomMediaRef> = {}): RoomMediaRef {
  return {
    providerId: "netflix",
    url: "https://www.netflix.com/title/80100172",
    title: "Something",
    kind: "provider",
    selectedByParticipantId: "host-1",
    selectedAtServerMs: NOW,
    validity: "valid",
    limitations: [],
    ...overrides,
  } as RoomMediaRef;
}

function playback(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return {
    ...emptyPlaybackState(NOW),
    status: "playing",
    positionSeconds: 100,
    anchorServerTimeMs: NOW,
    revision: 4,
    changedAtServerMs: NOW,
    ...overrides,
  };
}

describe("room phase", () => {
  test("waiting until content is selected", () => {
    expect(
      deriveRoomPhase({
        mediaRef: null,
        isCountingDown: false,
        playbackPhase: null,
        roomClosed: false,
        roomEnded: false,
      }),
    ).toBe("waiting-for-content");
  });

  test("content-selected, then countdown, then watching", () => {
    const base = { mediaRef: media(), roomClosed: false, roomEnded: false } as const;
    expect(deriveRoomPhase({ ...base, isCountingDown: false, playbackPhase: null })).toBe(
      "content-selected",
    );
    expect(deriveRoomPhase({ ...base, isCountingDown: true, playbackPhase: null })).toBe(
      "countdown",
    );
    expect(deriveRoomPhase({ ...base, isCountingDown: false, playbackPhase: "playing" })).toBe(
      "watching",
    );
    expect(deriveRoomPhase({ ...base, isCountingDown: false, playbackPhase: "paused" })).toBe(
      "paused",
    );
  });

  test("ended and closed outrank everything else", () => {
    expect(
      deriveRoomPhase({
        mediaRef: media(),
        isCountingDown: true,
        playbackPhase: "playing",
        roomClosed: true,
        roomEnded: false,
      }),
    ).toBe("closed");
    expect(
      deriveRoomPhase({
        mediaRef: media(),
        isCountingDown: false,
        playbackPhase: "playing",
        roomClosed: false,
        roomEnded: true,
      }),
    ).toBe("ended");
  });
});

describe("authoritative revisions", () => {
  test("only a strictly newer revision is fresh", () => {
    expect(isFreshRevision(4, 5)).toBe(true);
    expect(isFreshRevision(4, 4)).toBe(false);
    expect(isFreshRevision(4, 3)).toBe(false);
  });

  test("a stale incoming state is discarded, not merged", () => {
    const current = playback({ revision: 7, positionSeconds: 500 });
    const stale = playback({ revision: 6, positionSeconds: 10 });
    expect(reduceState(current, stale)).toBe(current);
    const fresh = playback({ revision: 8, positionSeconds: 900 });
    expect(reduceState(current, fresh).positionSeconds).toBe(900);
  });

  test("state-changing events carry a revision and go stale", () => {
    expect(isStateChanging("playback.play")).toBe(true);
    expect(isStateChanging("chat.message")).toBe(false);
    const event = createRoomEvent({
      roomId: "room-1",
      type: "playback.play",
      participantId: "host-1",
      serverTimeMs: NOW,
      roomRevision: 3,
      payload: {},
    });
    expect(isStaleEvent(event, 5)).toBe(true);
    expect(isStaleEvent(event, 2)).toBe(false);
  });
});

describe("command authority", () => {
  const context = {
    isHost: true,
    roomClosed: false,
    hasMedia: true,
    mediaValid: true,
    controlMode: "automatic" as const,
    currentRevision: 4,
  };

  test("the host may drive an automatic source", () => {
    expect(authorizeCommand({ kind: "play", positionSeconds: 0 }, context).allowed).toBe(true);
  });

  test("a guest may not issue host-only playback commands", () => {
    const verdict = authorizeCommand(
      { kind: "play", positionSeconds: 0 },
      { ...context, isHost: false },
    );
    expect(verdict).toEqual({ allowed: false, reason: "not-host" });
  });

  test("a closed room rejects every command", () => {
    const verdict = authorizeCommand(
      { kind: "pause", positionSeconds: 0 },
      { ...context, roomClosed: true },
    );
    expect(verdict).toEqual({ allowed: false, reason: "room-closed" });
  });

  test("a launch-only provider accepts no transport command", () => {
    const verdict = authorizeCommand(
      { kind: "play", positionSeconds: 0 },
      { ...context, controlMode: "launch-only" },
    );
    expect(verdict.allowed).toBe(false);
  });

  test("the countdown needs valid media", () => {
    expect(
      authorizeCommand(
        { kind: "start-countdown" },
        { ...context, controlMode: "launch-only", mediaValid: false },
      ).allowed,
    ).toBe(false);
    expect(
      authorizeCommand({ kind: "start-countdown" }, { ...context, controlMode: "launch-only" })
        .allowed,
    ).toBe(true);
  });

  test("a stale expected revision is rejected", () => {
    const verdict = authorizeCommand(
      { kind: "seek", positionSeconds: 12, playing: true, expectedRevision: 2 } as never,
      { ...context, expectedRevision: 2 } as never,
    );
    expect(verdict.allowed === false ? verdict.reason : "allowed").toBeDefined();
  });
});

describe("position projection", () => {
  test("a playing room advances with server time", () => {
    const state = playback({ positionSeconds: 100, anchorServerTimeMs: NOW });
    expect(projectPositionSeconds(state, NOW + 5_000)).toBeCloseTo(105, 3);
  });

  test("a paused room does not advance", () => {
    const state = playback({ status: "paused", positionSeconds: 100 });
    expect(projectPositionSeconds(state, NOW + 60_000)).toBeCloseTo(100, 3);
  });

  test("a late joiner computes the same position as everyone else", () => {
    const state = playback({ positionSeconds: 30, anchorServerTimeMs: NOW });
    const guestClockOffsetMs = -1_200;
    const guestServerNow = NOW + 20_000 - guestClockOffsetMs + guestClockOffsetMs;
    expect(projectPositionSeconds(state, guestServerNow)).toBeCloseTo(50, 3);
  });
});

describe("drift policy", () => {
  const policy = DEFAULT_DRIFT_POLICY;
  const calm = { isBuffering: false, msSinceSeek: null };

  test("launch-only providers have no policy at all", () => {
    expect(resolveDriftPolicy({ playbackControlMode: "launch-only" })).toBeNull();
    expect(resolveDriftPolicy({ playbackControlMode: "automatic" })).not.toBeNull();
  });

  test("bands follow the configured thresholds", () => {
    expect(classifyDriftCorrection(80, policy, calm)).toBe("none");
    expect(classifyDriftCorrection(400, policy, calm)).toBe("soft");
    expect(classifyDriftCorrection(-400, policy, calm)).toBe("soft");
    expect(classifyDriftCorrection(3_000, policy, calm)).toBe("hard");
  });

  test("corrections are suppressed while buffering and just after a seek", () => {
    expect(classifyDriftCorrection(3_000, policy, { isBuffering: true, msSinceSeek: null })).toBe(
      "suppressed",
    );
    expect(classifyDriftCorrection(3_000, policy, { isBuffering: false, msSinceSeek: 200 })).toBe(
      "suppressed",
    );
  });

  test("no policy means no correction and a manual label", () => {
    expect(classifyDriftCorrection(9_000, null, calm)).toBe("none");
    expect(syncStatusFor("none", null)).toBe("manual");
    expect(syncStatusFor("soft", policy)).toBe("catching-up");
    expect(syncStatusFor("hard", policy)).toBe("recovering");
  });
});

describe("readiness", () => {
  const people: readonly ParticipantRuntime[] = [
    { participantId: "a", displayName: "Ana", isHost: true, state: "ready" },
    { participantId: "b", displayName: "Ben", isHost: false, state: "ready" },
    { participantId: "c", displayName: "Cleo", isHost: false, state: "joined" },
    { participantId: "d", displayName: "Dee", isHost: false, state: "left" },
  ];

  test("counts the room and names who is missing", () => {
    const summary = summarizeReadiness(people);
    expect(summary.readyCount).toBe(2);
    expect(summary.total).toBe(3);
    expect(summary.waitingFor).toEqual(["Cleo"]);
  });

  test("host-only start is the default and never blocks the host", () => {
    expect(summarizeReadiness(people).thresholdMet).toBe(true);
    expect(summarizeReadiness(people, { kind: "all-ready" }).thresholdMet).toBe(false);
    expect(summarizeReadiness(people, { kind: "percentage", percent: 60 }).thresholdMet).toBe(true);
  });
});

describe("coordination requests", () => {
  test("round-trip through message metadata", () => {
    const encoded = encodeCoordination("pause-request");
    expect(decodeCoordination(encoded)).toBe("pause-request");
    expect(decodeCoordination({})).toBeNull();
    expect(decodeCoordination(null)).toBeNull();
    expect(decodeCoordination({ sf_coordination: "not-a-kind" })).toBeNull();
  });
});

describe("provider honesty", () => {
  test("YouTube is present precisely because the room can drive it", () => {
    const youtube = watchProviderById("youtube");
    expect(youtube?.playbackControlMode).toBe("automatic");
    expect(resolveDriftPolicy({ playbackControlMode: youtube!.playbackControlMode })).not.toBeNull();
  });


  test("Netflix stays launch-only, so no drift correction applies", () => {
    const netflix = watchProviderById("netflix");
    expect(netflix?.playbackControlMode).toBe("launch-only");
    expect(resolveDriftPolicy({ playbackControlMode: netflix!.playbackControlMode })).toBeNull();
  });
});
