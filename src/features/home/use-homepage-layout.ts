/**
 * Homepage app arrangement — Sprint H9 (feature layer).
 *
 * Holds the person's arrangement, persists it on this device, and reports each
 * change to session analytics. Every rule about *how* an arrangement changes
 * lives in the domain (`homepage-layout`); this hook only stores the result.
 *
 * The arrangement is device-local by design: it is a layout preference, not
 * account state, and it must survive a reload before any network call
 * resolves. When storage is denied the in-memory fallback keeps the session
 * consistent and the arrangement simply does not outlive the tab.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_HOMEPAGE_LAYOUT,
  arrangeApps,
  hideApp,
  isCustomized,
  moveApp,
  normalizeLayout,
  pinApp,
  resetLayout,
  shiftApp,
  unhideApp,
  unpinApp,
  type HomepageLayout,
} from "@/domain";
import { noteCustomized, recordPersonalization, trackEvent } from "@/features/analytics";
import { readLocalJson, writeLocalJson } from "@/foundation/preferences";

const STORAGE_KEY = "home-apps";

export interface HomepageLayoutModel<T extends { readonly key: string }> {
  readonly layout: HomepageLayout;
  readonly visible: readonly T[];
  readonly hidden: readonly T[];
  readonly pinnedCount: number;
  readonly isCustomized: boolean;
  readonly isEditing: boolean;
  setEditing(next: boolean): void;
  isPinned(key: string): boolean;
  move(key: string, toIndex: number): void;
  shift(key: string, direction: -1 | 1): void;
  pin(key: string): void;
  unpin(key: string): void;
  hide(key: string): void;
  unhide(key: string): void;
  reset(): void;
}

export function useHomepageLayout<T extends { readonly key: string }>(
  apps: readonly T[],
  profileId: string | null,
): HomepageLayoutModel<T> {
  const availableKeys = useMemo(() => apps.map((app) => app.key), [apps]);
  const [stored, setStored] = useState<HomepageLayout>(DEFAULT_HOMEPAGE_LAYOUT);
  const [isEditing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Read once per identity: a different person on the same device gets their
  // own arrangement rather than inheriting the previous one.
  useEffect(() => {
    const saved = readLocalJson<HomepageLayout>(STORAGE_KEY, profileId);
    setStored(saved ?? DEFAULT_HOMEPAGE_LAYOUT);
    setLoaded(true);
  }, [profileId]);

  const layout = useMemo(
    () => normalizeLayout(stored, availableKeys),
    [stored, availableKeys],
  );

  const customized = useMemo(
    () => isCustomized(layout, availableKeys),
    [layout, availableKeys],
  );

  useEffect(() => {
    noteCustomized(customized);
  }, [customized]);

  const apply = useCallback(
    (next: HomepageLayout) => {
      setStored(next);
      if (loaded) writeLocalJson(STORAGE_KEY, next, profileId);
    },
    [loaded, profileId],
  );

  const arranged = useMemo(() => arrangeApps(apps, layout), [apps, layout]);

  const change = useCallback(
    (
      next: HomepageLayout,
      kind: Parameters<typeof recordPersonalization>[0]["kind"],
      event: Parameters<typeof trackEvent>[0],
      providerKey: string | null,
    ) => {
      apply(next);
      recordPersonalization({ kind, providerKey });
      trackEvent(event, providerKey ? { provider: providerKey } : {});
    },
    [apply],
  );

  return useMemo<HomepageLayoutModel<T>>(
    () => ({
      layout,
      visible: arranged.visible,
      hidden: arranged.hidden,
      pinnedCount: arranged.pinnedCount,
      isCustomized: customized,
      isEditing,
      setEditing: (next: boolean) => {
        setEditing(next);
        if (next) trackEvent("homepage_customize_opened");
      },
      isPinned: (key: string) => layout.pinned.includes(key),
      move: (key, toIndex) =>
        change(moveApp(layout, key, toIndex), "reordered", "provider_reordered", key),
      shift: (key, direction) =>
        change(shiftApp(layout, key, direction), "reordered", "provider_reordered", key),
      pin: (key) => change(pinApp(layout, key), "pinned", "provider_pinned", key),
      unpin: (key) => change(unpinApp(layout, key), "unpinned", "provider_unpinned", key),
      hide: (key) => change(hideApp(layout, key), "hidden", "provider_hidden", key),
      unhide: (key) => change(unhideApp(layout, key), "unhidden", "provider_unhidden", key),
      reset: () =>
        change(resetLayout(availableKeys), "reset", "provider_order_reset", null),
    }),
    [arranged, availableKeys, change, customized, isEditing, layout],
  );
}
