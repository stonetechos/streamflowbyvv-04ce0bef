/**
 * Cache storage abstraction — Sprint 1.1 §6.
 *
 * The interface future local-first work builds on (Foundation §7). Sprint 1.1
 * ships the contract plus an in-memory implementation only; the IndexedDB
 * implementation belongs to the offline sprint, and swapping it in changes no
 * caller.
 */

export interface CacheEntry<T> {
  readonly value: T;
  /** Epoch milliseconds. `null` means the entry does not expire. */
  readonly expiresAt: number | null;
}

export interface CacheStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  /** Drops expired entries; safe to call on a timer or at startup. */
  prune(): Promise<void>;
}

/**
 * Process-local cache. Cleared on reload, so it must never hold anything the
 * user expects to persist.
 */
export function createMemoryCacheStorage(now: () => number = Date.now): CacheStorage {
  const entries = new Map<string, CacheEntry<unknown>>();

  const isExpired = (entry: CacheEntry<unknown>) =>
    entry.expiresAt !== null && entry.expiresAt <= now();

  return {
    async get<T>(key: string) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (isExpired(entry)) {
        entries.delete(key);
        return null;
      }
      return entry.value as T;
    },
    async set(key, value, ttlMs) {
      entries.set(key, {
        value,
        expiresAt: ttlMs === undefined ? null : now() + ttlMs,
      });
    },
    async remove(key) {
      entries.delete(key);
    },
    async clear() {
      entries.clear();
    },
    async prune() {
      for (const [key, entry] of entries) {
        if (isExpired(entry)) entries.delete(key);
      }
    },
  };
}
