/**
 * Homepage app arrangement — Sprint H9.
 *
 * A person may decide which streaming apps they see first and which ones they
 * would rather not see at all. That is a *discovery* preference and nothing
 * more: hiding an app does not withdraw support for it, pinning one does not
 * make it more controllable, and no ordering here can change a provider's sync
 * capability. The capability model stays exactly where it was — this module
 * only decides what order a list is shown in.
 *
 * Pure functions over a small value. No storage, no React, no provider truth.
 */

export interface HomepageLayout {
  /** Explicit order for unpinned apps. Keys absent from it fall to the end. */
  readonly order: readonly string[];
  /** Favourites, shown first, in this order. */
  readonly pinned: readonly string[];
  /** Kept out of the main shelf — still fully supported, still reachable. */
  readonly hidden: readonly string[];
}

export const DEFAULT_HOMEPAGE_LAYOUT: HomepageLayout = Object.freeze({
  order: Object.freeze([]) as readonly string[],
  pinned: Object.freeze([]) as readonly string[],
  hidden: Object.freeze([]) as readonly string[],
});

function without(list: readonly string[], key: string): readonly string[] {
  return list.filter((entry) => entry !== key);
}

function unique(list: readonly string[]): readonly string[] {
  return [...new Set(list)];
}

/**
 * Reconciles a stored arrangement with the apps that actually exist now.
 *
 * Migration rule: a person's arrangement is never overwritten. Apps that have
 * disappeared are dropped, and apps that appeared since the arrangement was
 * saved are appended after everything the person placed deliberately — visible
 * by default, because a new app the user has never seen must not arrive
 * hidden.
 */
export function normalizeLayout(
  layout: Partial<HomepageLayout> | null | undefined,
  availableKeys: readonly string[],
): HomepageLayout {
  const available = new Set(availableKeys);
  const keep = (list: readonly string[] | undefined) =>
    unique((list ?? []).filter((key) => available.has(key)));

  const pinned = keep(layout?.pinned);
  const hidden = keep(layout?.hidden).filter((key) => !pinned.includes(key));
  const placed = new Set([...pinned, ...hidden]);

  const order = keep(layout?.order).filter((key) => !placed.has(key));
  for (const key of order) placed.add(key);

  // Newly supported apps keep the catalog's own order and land at the end.
  const appended = availableKeys.filter((key) => !placed.has(key));

  return { order: [...order, ...appended], pinned, hidden };
}

/** True once the person has actually arranged something themselves. */
export function isCustomized(layout: HomepageLayout, availableKeys: readonly string[]): boolean {
  if (layout.pinned.length > 0 || layout.hidden.length > 0) return true;
  return layout.order.some((key, index) => availableKeys[index] !== key);
}

export interface ArrangedApps<T> {
  /** Pinned first, then the arranged remainder. */
  readonly visible: readonly T[];
  readonly hidden: readonly T[];
  readonly pinnedCount: number;
}

/** Applies an arrangement to any keyed list, without mutating it. */
export function arrangeApps<T extends { readonly key: string }>(
  apps: readonly T[],
  layout: HomepageLayout,
): ArrangedApps<T> {
  const byKey = new Map(apps.map((app) => [app.key, app]));
  const pinned = layout.pinned.map((key) => byKey.get(key)).filter(Boolean) as T[];
  const hidden = layout.hidden.map((key) => byKey.get(key)).filter(Boolean) as T[];
  const taken = new Set([...layout.pinned, ...layout.hidden]);
  const rest = layout.order
    .filter((key) => !taken.has(key))
    .map((key) => byKey.get(key))
    .filter(Boolean) as T[];

  return { visible: [...pinned, ...rest], hidden, pinnedCount: pinned.length };
}

/** The keys of the visible shelf, in the order they are shown. */
export function visibleOrder(layout: HomepageLayout): readonly string[] {
  const taken = new Set([...layout.pinned, ...layout.hidden]);
  return [...layout.pinned, ...layout.order.filter((key) => !taken.has(key))];
}

/**
 * Moves an app to an absolute position within the visible shelf. Pinned apps
 * move among the pinned block and unpinned apps among the remainder, so a drag
 * can never silently un-favourite something.
 */
export function moveApp(layout: HomepageLayout, key: string, toIndex: number): HomepageLayout {
  if (layout.hidden.includes(key)) return layout;

  if (layout.pinned.includes(key)) {
    const rest = without(layout.pinned, key);
    const index = Math.max(0, Math.min(toIndex, rest.length));
    return { ...layout, pinned: [...rest.slice(0, index), key, ...rest.slice(index)] };
  }

  const taken = new Set([...layout.pinned, ...layout.hidden]);
  const sequence = layout.order.filter((entry) => !taken.has(entry));
  if (!sequence.includes(key)) return layout;
  const rest = without(sequence, key);
  const target = Math.max(0, Math.min(toIndex - layout.pinned.length, rest.length));
  const reordered = [...rest.slice(0, target), key, ...rest.slice(target)];
  return { ...layout, order: reordered };
}

/** Keyboard and menu affordance: one step left or right within its block. */
export function shiftApp(layout: HomepageLayout, key: string, direction: -1 | 1): HomepageLayout {
  const sequence = visibleOrder(layout);
  const index = sequence.indexOf(key);
  if (index < 0) return layout;
  const next = index + direction;
  if (next < 0 || next >= sequence.length) return layout;
  return moveApp(layout, key, next);
}

export function pinApp(layout: HomepageLayout, key: string): HomepageLayout {
  if (layout.pinned.includes(key)) return layout;
  return {
    pinned: [...layout.pinned, key],
    order: without(layout.order, key),
    hidden: without(layout.hidden, key),
  };
}

export function unpinApp(layout: HomepageLayout, key: string): HomepageLayout {
  if (!layout.pinned.includes(key)) return layout;
  return {
    pinned: without(layout.pinned, key),
    // Returns to the head of the unpinned block, where the person last saw it.
    order: [key, ...without(layout.order, key)],
    hidden: layout.hidden,
  };
}

export function hideApp(layout: HomepageLayout, key: string): HomepageLayout {
  if (layout.hidden.includes(key)) return layout;
  return {
    pinned: without(layout.pinned, key),
    order: without(layout.order, key),
    hidden: [...layout.hidden, key],
  };
}

export function unhideApp(layout: HomepageLayout, key: string): HomepageLayout {
  if (!layout.hidden.includes(key)) return layout;
  return {
    pinned: layout.pinned,
    order: [...layout.order, key],
    hidden: without(layout.hidden, key),
  };
}

/** Back to the catalog's own order, with nothing pinned and nothing hidden. */
export function resetLayout(availableKeys: readonly string[]): HomepageLayout {
  return { order: [...availableKeys], pinned: [], hidden: [] };
}
