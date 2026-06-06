interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class ServerCache {
  private store = new Map<string, CacheEntry<unknown>>();

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
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export const serverCache = new ServerCache();
export const SESSIONS_CACHE_TTL = 30_000;
export const HISTORY_CACHE_TTL = 60_000;
export const RELATED_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
export const SPOTIFY_SEARCH_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
