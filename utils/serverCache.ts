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
