/**
 * H6 — social watch-party rules.
 *
 * Exercises the pure governance, invite, presence, and recovery rules. These
 * are product assertions, not certification evidence.
 */
import { describe, expect, test } from "bun:test";

import {
  DEFAULT_GOVERNANCE,
  canPerform,
  classifyPresence,
  nextRecoveryPhase,
  readGovernance,
  resolveInvite,
  seatRole,
  shouldAdoptSnapshot,
  writeGovernance,
  type PermissionContext,
} from "@/domain/watch/room-governance";

const context = (over: Partial<PermissionContext> = {}): PermissionContext => ({
  seat: "participant",
  settings: DEFAULT_GOVERNANCE,
  roomStatus: "active",
  ...over,
});

describe("seats", () => {
  test("a removed member holds no seat, whatever their role said", () => {
    expect(seatRole({ role: "host", state: "removed", isMutedByHost: false })).toBe("removed");
  });

  test("a host-muted participant is a distinct seat", () => {
    expect(seatRole({ role: "guest", state: "joined", isMutedByHost: true })).toBe("muted");
  });
});

describe("permissions", () => {
  test("only the host may close the room", () => {
    expect(canPerform("close_room", context({ seat: "host" }))).toBe(true);
    expect(canPerform("close_room", context({ seat: "co_host" }))).toBe(false);
  });

  test("a co-host may moderate but a participant may not", () => {
    expect(canPerform("remove_participant", context({ seat: "co_host" }))).toBe(true);
    expect(canPerform("remove_participant", context())).toBe(false);
  });

  test("nobody moderates a room that already ended", () => {
    expect(canPerform("lock_room", context({ seat: "host", roomStatus: "ended" }))).toBe(false);
  });

  test("chat follows the room setting, not the seat", () => {
    expect(canPerform("send_chat", context())).toBe(true);
    expect(
      canPerform(
        "send_chat",
        context({ settings: { ...DEFAULT_GOVERNANCE, isChatEnabled: false } }),
      ),
    ).toBe(false);
  });

  test("a removed seat can do nothing at all", () => {
    expect(canPerform("send_chat", context({ seat: "removed" }))).toBe(false);
  });
});

describe("settings round-trip", () => {
  test("unknown metadata falls back to the private-by-default shape", () => {
    expect(readGovernance(null)).toEqual(DEFAULT_GOVERNANCE);
    expect(readGovernance({ governance: 7 })).toEqual(DEFAULT_GOVERNANCE);
  });

  test("a patch preserves unrelated metadata keys", () => {
    const next = writeGovernance({ media: { title: "x" } }, { isLocked: true });
    expect(next["media"]).toEqual({ title: "x" });
    expect(readGovernance(next).isLocked).toBe(true);
  });
});

describe("invite resolution", () => {
  const facts = {
    roomStatus: "lobby" as const,
    settings: DEFAULT_GOVERNANCE,
    seatsTaken: 2,
    capacity: 8,
    viewerMembership: null,
    nowIso: "2026-01-01T00:00:00.000Z",
  };

  test("a live link into an open room is valid", () => {
    expect(resolveInvite(facts)).toBe("valid");
  });

  test("a revoked link reads as revoked, never as full", () => {
    expect(
      resolveInvite({
        ...facts,
        seatsTaken: 8,
        settings: { ...DEFAULT_GOVERNANCE, isInviteActive: false },
      }),
    ).toBe("revoked");
  });

  test("a locked room is distinguished from a full one", () => {
    expect(resolveInvite({ ...facts, settings: { ...DEFAULT_GOVERNANCE, isLocked: true } })).toBe(
      "room_locked",
    );
    expect(resolveInvite({ ...facts, seatsTaken: 8 })).toBe("room_full");
  });

  test("an expired link expires", () => {
    expect(
      resolveInvite({
        ...facts,
        settings: { ...DEFAULT_GOVERNANCE, inviteExpiresAt: "2025-12-31T00:00:00.000Z" },
      }),
    ).toBe("expired");
  });

  test("a removed person is not quietly re-admitted", () => {
    expect(resolveInvite({ ...facts, viewerMembership: "removed" })).toBe("revoked");
  });
});

describe("presence honesty", () => {
  test("watching is never inferred from liveness alone", () => {
    expect(
      classifyPresence({
        membership: "joined",
        liveness: "online",
        isWatching: false,
        hasSelfDeclaredReady: false,
        voice: "off",
      }),
    ).toBe("joined");
  });

  test("voice states are only reported when the transport reports them", () => {
    expect(
      classifyPresence({
        membership: "joined",
        liveness: "online",
        isWatching: false,
        hasSelfDeclaredReady: true,
        voice: "muted",
      }),
    ).toBe("voice_muted");
  });

  test("an unknown heartbeat is disconnected, not joined", () => {
    expect(
      classifyPresence({
        membership: "joined",
        liveness: "unknown",
        isWatching: true,
        hasSelfDeclaredReady: true,
        voice: "connected",
      }),
    ).toBe("disconnected");
  });
});

describe("recovery", () => {
  test("a stale snapshot never overwrites newer local state", () => {
    expect(shouldAdoptSnapshot({ localRevision: 5, incomingRevision: 4 })).toBe(false);
    expect(shouldAdoptSnapshot({ localRevision: 5, incomingRevision: 5 })).toBe(true);
  });

  test("phases follow reachability and visibility", () => {
    const base = { isOnline: true, isDocumentVisible: true, wasInterrupted: false, hasFreshSnapshot: true };
    expect(nextRecoveryPhase(base)).toBe("online");
    expect(nextRecoveryPhase({ ...base, isOnline: false })).toBe("offline");
    expect(nextRecoveryPhase({ ...base, isDocumentVisible: false })).toBe("suspended");
    expect(
      nextRecoveryPhase({ ...base, wasInterrupted: true, hasFreshSnapshot: false }),
    ).toBe("recovering");
    expect(nextRecoveryPhase({ ...base, wasInterrupted: true })).toBe("recovered");
  });
});
