interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// Expired entries are otherwise only dropped when read again
const SWEEP_THRESHOLD = 500;
const SWEEP_INTERVAL_MS = 60_000;

class ServerCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private lastSweep = 0;

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    const now = Date.now();
    if (this.store.size >= SWEEP_THRESHOLD && now - this.lastSweep > SWEEP_INTERVAL_MS) {
      this.lastSweep = now;
      for (const [k, entry] of this.store) {
        if (now > entry.expiresAt) this.store.delete(k);
      }
    }
    this.store.set(key, { value, expiresAt: now + ttlMs });
  }
}

export const serverCache = new ServerCache();
export const SESSIONS_CACHE_TTL = 30_000;
export const HISTORY_CACHE_TTL = 60_000;
export const ITEM_DETAIL_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
export const RELATED_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
export const SPOTIFY_SEARCH_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
