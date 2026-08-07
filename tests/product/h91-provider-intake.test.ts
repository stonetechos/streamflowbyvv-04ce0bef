/**
 * H9.1 product tests — new provider intake and shelf arrangement migration.
 *
 * Deterministic checks over pure functions and presentation builders. Nothing
 * here is certification evidence.
 */
import { describe, expect, test } from "bun:test";

import {
  WATCH_PROVIDER_DEFINITIONS,
  arrangeApps,
  normalizeLayout,
  pinApp,
  hideApp,
} from "@/domain";
import { buildServiceShelf } from "@/features/home/service-shelf";
import type { ProviderOptionView } from "@/features/providers";

const NEW_PROVIDERS = ["sonyliv", "mxplayer", "discovery_plus", "jiotv"] as const;
const SHELF_KEYS = ["sonyliv", "mx_player", "discovery_plus", "jiotv"] as const;

const identity = (key: string) => key;

function shelf() {
  return buildServiceShelf([] as readonly ProviderOptionView[], identity);
}

describe("provider intake", () => {
  test("every intaken provider exists in the capability model", () => {
    for (const id of NEW_PROVIDERS) {
      const entry = WATCH_PROVIDER_DEFINITIONS.find((p) => p.providerId === id);
      expect(entry).toBeDefined();
      expect(entry?.enabled).toBe(true);
    }
  });

  test("none of them claims playback control or embedded playback", () => {
    for (const id of NEW_PROVIDERS) {
      const entry = WATCH_PROVIDER_DEFINITIONS.find((p) => p.providerId === id)!;
      expect(entry.playbackControlMode).toBe("launch-only");
      expect(entry.allowsEmbeddedPlayback).toBe(false);
      expect(entry.requiresOwnSubscription).toBe(true);
      expect(entry.limitations.length).toBeGreaterThan(0);
    }
  });

  test("display names read the way people know the brands", () => {
    const byId = new Map(WATCH_PROVIDER_DEFINITIONS.map((p) => [p.providerId, p.displayName]));
    expect(byId.get("sonyliv")).toBe("Sony LIV");
    expect(byId.get("mxplayer")).toBe("MX Player");
    expect(byId.get("discovery_plus")).toBe("discovery+");
    expect(byId.get("jiotv")).toBe("JioTV");
  });

  test("YouTube remains absent from the product", () => {
    for (const entry of WATCH_PROVIDER_DEFINITIONS) {
      expect(entry.providerId).not.toContain("youtube");
      expect(entry.displayName.toLowerCase()).not.toContain("youtube");
    }
  });

  test("the shelf shows each new brand, and never as choosable without a catalog row", () => {
    const cards = shelf();
    for (const key of SHELF_KEYS) {
      const card = cards.find((entry) => entry.key === key);
      expect(card).toBeDefined();
      expect(card?.isChoosable).toBe(false);
      expect(card?.status).toBe("coming_soon");
      expect(card?.supportsDeepLink).toBe(false);
    }
  });
});

describe("shelf migration", () => {
  const keys = () => shelf().map((card) => card.key);

  test("a customized arrangement survives new providers arriving", () => {
    const before = ["netflix", "prime_video", "hulu", "tubi"];
    let layout = normalizeLayout(null, before);
    layout = pinApp(layout, "hulu");
    layout = hideApp(layout, "tubi");
    const custom = { ...layout, order: ["prime_video", "netflix"] };

    const migrated = normalizeLayout(custom, keys());

    expect(migrated.pinned).toEqual(["hulu"]);
    expect(migrated.hidden).toEqual(["tubi"]);
    expect(migrated.order.slice(0, 2)).toEqual(["prime_video", "netflix"]);
    for (const key of SHELF_KEYS) expect(migrated.order).toContain(key);
  });

  test("new providers arrive visible, after everything placed deliberately", () => {
    const migrated = normalizeLayout({ order: ["netflix"], pinned: [], hidden: [] }, keys());
    const arranged = arrangeApps(shelf(), migrated);
    const visible = arranged.visible.map((card) => card.key);
    for (const key of SHELF_KEYS) expect(visible).toContain(key);
    expect(visible.indexOf("netflix")).toBeLessThan(visible.indexOf("jiotv"));
  });

  test("a hidden new provider stays reachable through the hidden list", () => {
    const layout = hideApp(normalizeLayout(null, keys()), "jiotv");
    const arranged = arrangeApps(shelf(), layout);
    expect(arranged.visible.some((card) => card.key === "jiotv")).toBe(false);
    expect(arranged.hidden.some((card) => card.key === "jiotv")).toBe(true);
  });
});
