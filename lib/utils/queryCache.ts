/**
 * createQueryCache — lightweight module-level SWR cache factory.
 *
 * Returns a typed cache object per unique key.
 * Usage:
 *   const noticesCache = createQueryCache<Notice[]>()
 *   const entry = noticesCache.get("page:1:limit:25")
 *   noticesCache.set("page:1:limit:25", data, 60_000)
 *   noticesCache.invalidate()
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export function createQueryCache<T>(defaultTtl = 60_000) {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | null {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.data;
    },
    set(key: string, data: T, ttl = defaultTtl) {
      store.set(key, { data, expiresAt: Date.now() + ttl });
    },
    isStale(key: string, ttl = defaultTtl): boolean {
      const entry = store.get(key);
      if (!entry) return true;
      return Date.now() > entry.expiresAt;
    },
    invalidate(key?: string) {
      if (key) store.delete(key);
      else store.clear();
    },
    size() {
      return store.size;
    },
  };
}