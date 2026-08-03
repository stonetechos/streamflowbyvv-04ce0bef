/**
 * Pending destination — Release Blocker Sprint.
 *
 * One place that remembers where a person was going when authentication
 * interrupted them: an invite link, a room, a shared piece of content, a deep
 * link of any shape. The whole intent is preserved as a same-origin path with
 * its query intact, so room id, invite token, share token, join code, provider
 * and selected content all survive the sign-in detour.
 *
 * Presentation-layer memory only. It stores a path, never a credential, and it
 * decides nothing about admission — the domain still rules on every entry.
 */
const STORAGE_KEY = "streamflow.pending_destination";

/** A remembered intent goes stale; half an hour is longer than any sign-in. */
const MAX_AGE_MS = 30 * 60 * 1000;

interface StoredDestination {
  readonly path: string;
  readonly at: number;
}

/**
 * Same-origin application paths only, and never an authentication screen:
 * remembering one of those is how redirect loops are born.
 */
export function isResumablePath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.length > 512) return false;
  const [pathname] = path.split("?");
  if (pathname === undefined) return false;
  return !/^\/auth(\/|$)/.test(pathname);
}

/**
 * Persisted in `localStorage` rather than the tab: an emailed confirmation
 * link often opens in a new tab, and the journey must survive that.
 */
export function rememberDestination(path: string): void {
  if (typeof window === "undefined" || !isResumablePath(path)) return;
  try {
    const entry: StoredDestination = { path, at: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // A blocked storage is not a reason to break the journey.
  }
}

/** Remembers wherever the browser currently is, query string included. */
export function rememberCurrentDestination(): void {
  if (typeof window === "undefined") return;
  rememberDestination(`${window.location.pathname}${window.location.search}`);
}

export function readDestination(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Partial<StoredDestination>;
    if (typeof entry.path !== "string" || typeof entry.at !== "number") return null;
    if (Date.now() - entry.at > MAX_AGE_MS) return null;
    return isResumablePath(entry.path) ? entry.path : null;
  } catch {
    return null;
  }
}

export function clearDestination(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

/** Reads and forgets in one step, so a resume can never run twice. */
export function claimDestination(): string | null {
  const path = readDestination();
  if (path) clearDestination();
  return path;
}
