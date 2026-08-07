/**
 * Device-local preference store — Milestone E.
 *
 * A tiny, vendor-neutral wrapper over `localStorage` for the handful of values
 * that are genuinely device-scoped and must survive a reload before any
 * network call resolves: chosen theme, whether first-run has been completed,
 * the last room the person was in, and the email to prefill on the sign-in
 * form.
 *
 * Deliberately NOT a cache of server state, and never a place for credentials,
 * tokens or provider material (Foundation §10.1, §10.3). Server-owned
 * preferences continue to live behind `UserService` and the preference
 * repositories.
 */
import { logger } from "@/foundation/logging";

const NAMESPACE = "streamflow.v1";

export const LOCAL_PREFERENCE_KEYS = Object.freeze({
  THEME: "theme",
  LAST_EMAIL: "last-email",
  LAST_ROOM: "last-room",
  ONBOARDING: "onboarding",
  HOME_APPS: "home-apps",
});

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Private-mode browsers throw on access. Degrade silently to in-memory.
    return null;
  }
}

function fullKey(key: string, scope?: string | null): string {
  return scope ? `${NAMESPACE}.${key}.${scope}` : `${NAMESPACE}.${key}`;
}

/** In-memory fallback so the app behaves consistently when storage is denied. */
const memory = new Map<string, string>();

export function readLocalPreference(key: string, scope?: string | null): string | null {
  const composed = fullKey(key, scope);
  const store = storage();
  if (!store) return memory.get(composed) ?? null;
  try {
    return store.getItem(composed);
  } catch {
    return memory.get(composed) ?? null;
  }
}

export function writeLocalPreference(key: string, value: string, scope?: string | null): void {
  const composed = fullKey(key, scope);
  memory.set(composed, value);
  const store = storage();
  if (!store) return;
  try {
    store.setItem(composed, value);
  } catch (cause) {
    logger.warn("Local preference write failed", { module: "preferences", key, error: cause });
  }
}

export function clearLocalPreference(key: string, scope?: string | null): void {
  const composed = fullKey(key, scope);
  memory.delete(composed);
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(composed);
  } catch {
    // Nothing actionable; the in-memory copy is already gone.
  }
}

export function readLocalJson<T>(key: string, scope?: string | null): T | null {
  const raw = readLocalPreference(key, scope);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeLocalJson(key: string, value: unknown, scope?: string | null): void {
  writeLocalPreference(key, JSON.stringify(value), scope);
}
