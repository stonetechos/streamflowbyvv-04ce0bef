/**
 * H9 product tests — lobby key joining and homepage arrangement.
 *
 * Deterministic domain checks only. Nothing here is certification evidence:
 * these are ordinary product tests over pure functions.
 */
import { describe, expect, test } from "bun:test";

import {
  DEFAULT_HOMEPAGE_LAYOUT,
  ROOM_KEY_ALPHABET,
  ROOM_KEY_JOIN_STATES,
  ROOM_KEY_LENGTH,
  arrangeApps,
  decodeRoomKey,
  encodeRoomKey,
  formatRoomKey,
  hideApp,
  isCustomized,
  normalizeLayout,
  normalizeRoomKeyInput,
  pinApp,
  redactRoomKey,
  resetLayout,
  resolveJoinCode,
  roomKeyStateFromRefusal,
  shiftApp,
  summarizeJoinSpeed,
  summarizePersonalization,
  unhideApp,
  validateRoomKeyShape,
} from "@/domain";

import { enBundle as en } from "@/foundation/localization/bundles/en";
import { hiINBundle as hi } from "@/foundation/localization/bundles/hi-IN";

const CODES = ["ROM-000001", "ROM-000123", "ROM-004096", "ROM-999999"];

describe("room key", () => {
  test("every room code round-trips through its key", () => {
    for (const code of CODES) {
      const key = encodeRoomKey(code);
      expect(key).not.toBeNull();
      expect(key).toHaveLength(ROOM_KEY_LENGTH);
      expect(decodeRoomKey(key)).toBe(code);
    }
  });

  test("distinct rooms never share a key", () => {
    const keys = new Set(CODES.map((code) => encodeRoomKey(code)));
    expect(keys.size).toBe(CODES.length);
  });

  test("the alphabet excludes characters people confuse", () => {
    for (const character of "01ILOU") {
      expect(ROOM_KEY_ALPHABET).not.toContain(character);
    }
  });

  test("a single wrong character is refused rather than sent to another room", () => {
    const key = encodeRoomKey("ROM-000123")!;
    const swapped = (key[0] === "2" ? "3" : "2") + key.slice(1);
    expect(decodeRoomKey(swapped)).toBeNull();
  });

  test("input is forgiving about case, spacing and separators", () => {
    const key = encodeRoomKey("ROM-000123")!;
    const typed = `${key.slice(0, 3).toLowerCase()} - ${key.slice(3)}`;
    expect(normalizeRoomKeyInput(typed)).toBe(key);
    expect(resolveJoinCode(typed)).toBe("ROM-000123");
  });

  test("the legacy room code still opens the same room", () => {
    expect(resolveJoinCode("rom-000123")).toBe("ROM-000123");
  });

  test("shape is validated before anything is asked of the room", () => {
    expect(validateRoomKeyShape("")).not.toBeNull();
    expect(validateRoomKeyShape("ABC")).not.toBeNull();
    expect(validateRoomKeyShape(encodeRoomKey("ROM-000001")!)).toBeNull();
  });

  test("the key is displayed in readable groups", () => {
    const key = encodeRoomKey("ROM-000123")!;
    expect(formatRoomKey(key)).toBe(`${key.slice(0, 3)}-${key.slice(3)}`);
  });

  test("a key is never written out in an analytics payload", () => {
    const key = encodeRoomKey("ROM-000123")!;
    const redacted = redactRoomKey(key);
    expect(redacted).not.toContain(key);
    expect(redacted).not.toContain(key.slice(0, 3));
  });
});

describe("join refusals", () => {
  test("each refusal keeps its own meaning", () => {
    expect(roomKeyStateFromRefusal("SF-ROOM-ENDED")).toBe("expired");
    expect(roomKeyStateFromRefusal("SF-ROOM-CAPACITY-EXCEEDED")).toBe("full");
    expect(roomKeyStateFromRefusal("SF-ROOM-FORBIDDEN")).toBe("locked");
    expect(roomKeyStateFromRefusal("SF-ROOM-DELETED")).toBe("revoked");
    expect(roomKeyStateFromRefusal("SF-ROOM-ALREADY-IN-ANOTHER-ROOM")).toBe("already_in_room");
    expect(roomKeyStateFromRefusal("SF-NET-TIMEOUT")).toBe("network_error");
  });

  test("an unknown refusal never reads as success", () => {
    const state = roomKeyStateFromRefusal("SF-SOMETHING-ELSE");
    expect(state).not.toBe("success");
  });

  test("every refusal state has wording in both bundles", () => {
    for (const state of ROOM_KEY_JOIN_STATES) {
      if (state === "empty" || state === "typing") continue;
      expect(en.strings[`room.key.state.${state}`]).toBeTruthy();
      expect(hi.strings[`room.key.state.${state}`]).toBeTruthy();
    }
  });
});

const APPS = ["netflix", "prime", "hotstar", "sonyliv", "zee5"].map((key) => ({ key }));
const KEYS = APPS.map((app) => app.key);

describe("homepage arrangement", () => {
  test("the default arrangement shows every app in catalog order", () => {
    const arranged = arrangeApps(APPS, normalizeLayout(DEFAULT_HOMEPAGE_LAYOUT, KEYS));
    expect(arranged.visible.map((app) => app.key)).toEqual(KEYS);
    expect(arranged.hidden).toHaveLength(0);
  });

  test("pinning moves an app to the front without removing others", () => {
    const layout = pinApp(normalizeLayout(DEFAULT_HOMEPAGE_LAYOUT, KEYS), "zee5");
    const arranged = arrangeApps(APPS, layout);
    expect(arranged.visible[0]!.key).toBe("zee5");
    expect(arranged.visible).toHaveLength(APPS.length);
  });

  test("hiding an app removes it from the shelf but not from the product", () => {
    const layout = hideApp(normalizeLayout(DEFAULT_HOMEPAGE_LAYOUT, KEYS), "hotstar");
    const arranged = arrangeApps(APPS, layout);
    expect(arranged.visible.map((app) => app.key)).not.toContain("hotstar");
    expect(arranged.hidden.map((app) => app.key)).toEqual(["hotstar"]);
    expect(arrangeApps(APPS, unhideApp(layout, "hotstar")).visible).toHaveLength(APPS.length);
  });

  test("shifting respects the ends of the shelf", () => {
    const base = normalizeLayout(DEFAULT_HOMEPAGE_LAYOUT, KEYS);
    expect(arrangeApps(APPS, shiftApp(base, KEYS[0]!, -1)).visible[0]!.key).toBe(KEYS[0]);
    const moved = arrangeApps(APPS, shiftApp(base, KEYS[0]!, 1)).visible;
    expect(moved[1]!.key).toBe(KEYS[0]);
  });

  test("a newly added provider appears rather than disappearing", () => {
    const saved = normalizeLayout(DEFAULT_HOMEPAGE_LAYOUT, KEYS);
    const withNew = normalizeLayout(saved, [...KEYS, "jiocinema"]);
    const arranged = arrangeApps([...APPS, { key: "jiocinema" }], withNew);
    expect(arranged.visible.map((app) => app.key)).toContain("jiocinema");
  });

  test("reset returns the default arrangement", () => {
    const layout = hideApp(pinApp(normalizeLayout(DEFAULT_HOMEPAGE_LAYOUT, KEYS), "zee5"), "prime");
    expect(isCustomized(layout, KEYS)).toBe(true);
    expect(isCustomized(resetLayout(KEYS), KEYS)).toBe(false);
  });

  test("an arrangement referring to removed providers is repaired, not trusted", () => {
    const layout = normalizeLayout(
      { order: ["ghost", "zee5"], pinned: ["ghost"], hidden: ["ghost"] },
      KEYS,
    );
    expect(layout.order).not.toContain("ghost");
    expect(layout.pinned).not.toContain("ghost");
    expect(layout.hidden).not.toContain("ghost");
    expect(arrangeApps(APPS, layout).visible).toHaveLength(APPS.length);
  });
});

describe("H9 measurement", () => {
  test("join speed separates code joins from link joins", () => {
    const metrics = summarizeJoinSpeed([
      { path: "code", outcome: "success", reason: null, elapsedMs: 4000 },
      { path: "code", outcome: "blocked", reason: "invalid", elapsedMs: 9000 },
      { path: "link", outcome: "success", reason: null, elapsedMs: 6000 },
    ]);
    expect(metrics.codeAttempts).toBe(2);
    expect(metrics.codeSuccesses).toBe(1);
    expect(metrics.codeShare).toBeCloseTo(0.5, 5);
    expect(metrics.medianTimeToCodeJoinMs).toBe(4000);
  });

  test("personalization reports favourites without naming a person", () => {
    const metrics = summarizePersonalization(
      [
        { kind: "pinned", providerKey: "zee5" },
        { kind: "hidden", providerKey: "prime" },
        { kind: "reordered", providerKey: "netflix" },
      ],
      [
        { fromFavorite: true, elapsedMs: 2000 },
        { fromFavorite: false, elapsedMs: 8000 },
      ],
      { customized: true },
    );
    expect(metrics.favoriteSelectionRate).toBeCloseTo(0.5, 5);
    expect(metrics.reorders).toBe(1);
    expect(metrics.mostPinned[0]!.key).toBe("zee5");
    expect(metrics.mostHidden[0]!.key).toBe("prime");
    expect(JSON.stringify(metrics)).not.toContain("profile");
  });

  test("no measurement is invented from an empty session", () => {
    const metrics = summarizeJoinSpeed([]);
    expect(metrics.codeSuccessRate).toBeNull();
    expect(metrics.medianTimeToCodeJoinMs).toBeNull();
    expect(
      summarizePersonalization([], [], { customized: false }).favoriteSelectionRate,
    ).toBeNull();
  });
});

describe("wording", () => {
  test("the room key is explained as a shortcut, not a secret credential", () => {
    expect(en.strings["room.key.description"]).toContain("link");
    expect(en.strings["room.key.title"]).toBeTruthy();
  });

  test("arranging the homepage is described as a personal view only", () => {
    expect(en.strings["home.services.arrange.hint"]).toContain("homepage only");
    expect(en.strings["home.services.arrange.hidden_note"]).toContain("still work");
  });

  test("both bundles carry every H9 key", () => {
    const h9 = Object.keys(en.strings).filter(
      (key) =>
        key.startsWith("room.key.") ||
        key.startsWith("home.services.arrange.") ||
        key.startsWith("beta.join.") ||
        key.startsWith("beta.personalization."),
    );
    expect(h9.length).toBeGreaterThan(20);
    for (const key of h9) expect(hi.strings[key]).toBeTruthy();
  });
});
