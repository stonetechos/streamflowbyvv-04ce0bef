/**
 * Phase A — the live room console.
 *
 * These tests hold the honesty line: a room that cannot observe a provider
 * player must never present a measured clock, and must always disclose the
 * limitation. They also pin the declared stopwatch's arithmetic.
 */
import { describe, expect, test } from "bun:test";

import {
  classifyFreshness,
  deriveRoomConsole,
  formatRoomClock,
  projectDeclaredClock,
  type HostDeclaration,
  type RoomConsoleInput,
} from "@/domain";

import en from "@/foundation/localization/bundles/en";
import hi from "@/foundation/localization/bundles/hi-IN";

const NOW = 1_700_000_000_000;

function input(overrides: Partial<RoomConsoleInput> = {}): RoomConsoleInput {
  return {
    hasSource: true,
    isAutomatic: false,
    isHost: true,
    countdownSeconds: null,
    playbackStatus: "manual-sync",
    positionSeconds: 0,
    declarations: [],
    nowMs: NOW,
    roomEnded: false,
    canStartCountdown: true,
    ...overrides,
  };
}

describe("declared clock", () => {
  test("a start opens a running stopwatch", () => {
    const declarations: HostDeclaration[] = [{ kind: "started", atMs: NOW - 65_000 }];
    const clock = projectDeclaredClock(declarations, NOW);
    expect(clock.isRunning).toBe(true);
    expect(clock.hasStarted).toBe(true);
    expect(clock.elapsedMs).toBe(65_000);
  });

  test("a pause freezes it and a resume continues from there", () => {
    const declarations: HostDeclaration[] = [
      { kind: "started", atMs: NOW - 120_000 },
      { kind: "paused", atMs: NOW - 90_000 },
      { kind: "resumed", atMs: NOW - 30_000 },
    ];
    const clock = projectDeclaredClock(declarations, NOW);
    expect(clock.elapsedMs).toBe(60_000);
    expect(clock.isRunning).toBe(true);
  });

  test("a second start is a new sitting, not an extension", () => {
    const clock = projectDeclaredClock(
      [
        { kind: "started", atMs: NOW - 600_000 },
        { kind: "started", atMs: NOW - 10_000 },
      ],
      NOW,
    );
    expect(clock.elapsedMs).toBe(10_000);
  });

  test("out-of-order statements are absorbed, never double counted", () => {
    const clock = projectDeclaredClock(
      [
        { kind: "paused", atMs: NOW - 40_000 },
        { kind: "started", atMs: NOW - 60_000 },
        { kind: "paused", atMs: NOW - 40_000 },
      ],
      NOW,
    );
    expect(clock.elapsedMs).toBe(20_000);
    expect(clock.isRunning).toBe(false);
  });

  test("clocks read as mm:ss, and h:mm:ss past the hour", () => {
    expect(formatRoomClock(0)).toBe("00:00");
    expect(formatRoomClock(65_000)).toBe("01:05");
    expect(formatRoomClock(3_725_000)).toBe("1:02:05");
    expect(formatRoomClock(-5)).toBe("00:00");
  });
});

describe("room console phases", () => {
  test("a room with nothing chosen is a lobby", () => {
    expect(deriveRoomConsole(input({ hasSource: false })).phase).toBe("lobby");
  });

  test("a countdown outranks every other phase", () => {
    expect(deriveRoomConsole(input({ countdownSeconds: 3 })).phase).toBe("counting-down");
  });

  test("a launch-only room watches only once the host says so", () => {
    const before = deriveRoomConsole(input());
    expect(before.phase).toBe("manual-sync");
    const after = deriveRoomConsole(
      input({ declarations: [{ kind: "started", atMs: NOW - 1_000 }] }),
    );
    expect(after.phase).toBe("watching");
  });

  test("the host's pause is shown as the host's pause", () => {
    const view = deriveRoomConsole(
      input({
        declarations: [
          { kind: "started", atMs: NOW - 60_000 },
          { kind: "paused", atMs: NOW - 5_000 },
        ],
      }),
    );
    expect(view.phase).toBe("paused-by-host");
    expect(view.clock.isRunning).toBe(false);
  });

  test("a driven room reports a measured clock and no disclosure", () => {
    const view = deriveRoomConsole(
      input({ isAutomatic: true, playbackStatus: "playing", positionSeconds: 42 }),
    );
    expect(view.phase).toBe("watching");
    expect(view.clock.kind).toBe("measured");
    expect(view.clock.elapsedMs).toBe(42_000);
    expect(view.disclosureKeys).toEqual([]);
    expect(view.isManual).toBe(false);
  });
});

describe("honesty", () => {
  test("a launch-only room always discloses that it cannot read the player", () => {
    const view = deriveRoomConsole(input());
    expect(view.disclosureKeys).toContain("room.console.disclosure.no_read");
    expect(view.isManual).toBe(true);
  });

  test("an unstarted room shows no time at all rather than zero progress", () => {
    expect(deriveRoomConsole(input()).clock.kind).toBe("none");
  });

  test("a driven room offers no declaration buttons: it has real transport", () => {
    expect(
      deriveRoomConsole(input({ isAutomatic: true, playbackStatus: "playing" })).hostActions,
    ).toEqual([]);
  });
});

describe("host actions", () => {
  test("a guest is never offered a declaration", () => {
    expect(deriveRoomConsole(input({ isHost: false })).hostActions).toEqual([]);
  });

  test("the host is offered exactly the next honest statement", () => {
    expect(deriveRoomConsole(input()).hostActions).toContain("declare-start");
    expect(
      deriveRoomConsole(input({ declarations: [{ kind: "started", atMs: NOW - 1 }] })).hostActions,
    ).toContain("declare-pause");
    expect(
      deriveRoomConsole(
        input({
          declarations: [
            { kind: "started", atMs: NOW - 100 },
            { kind: "paused", atMs: NOW - 50 },
          ],
        }),
      ).hostActions,
    ).toContain("declare-resume");
  });

  test("an ended room takes its actions away", () => {
    expect(deriveRoomConsole(input({ roomEnded: true })).hostActions).toEqual([]);
  });

  test("a running countdown suspends declarations until it finishes", () => {
    expect(deriveRoomConsole(input({ countdownSeconds: 2 })).hostActions).toEqual([]);
  });
});

describe("presence freshness", () => {
  test("a recent heartbeat is live", () => {
    expect(classifyFreshness("online", NOW - 2_000, NOW)).toBe("live");
  });

  test("an old heartbeat goes stale without claiming departure", () => {
    expect(classifyFreshness("online", NOW - 120_000, NOW)).toBe("stale");
  });

  test("leaving is offline, not stale", () => {
    expect(classifyFreshness("left", NOW, NOW)).toBe("offline");
  });
});

describe("copy", () => {
  test("both bundles carry every console key", () => {
    const keys = Object.keys(en.strings ?? en).filter((key) =>
      key.startsWith("room.console.") || key.startsWith("room.participant.badge."),
    );
    expect(keys.length).toBeGreaterThan(15);
    const target = (hi.strings ?? hi) as Record<string, string>;
    for (const key of keys) expect(typeof target[key]).toBe("string");
  });

  test("no console string promises automatic synchronization", () => {
    const strings = (en.strings ?? en) as Record<string, string>;
    for (const [key, value] of Object.entries(strings)) {
      if (!key.startsWith("room.console.")) continue;
      expect(value.toLowerCase()).not.toContain("automatically sync");
    }
  });
});
