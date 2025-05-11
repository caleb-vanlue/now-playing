interface CacheItem {
  url: string;
  timestamp: number;
}

class SpotifyUrlCache {
  private cache: Map<string, CacheItem> = new Map();
  private readonly CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  private createKey(artist: string, title: string): string {
    return `${artist.toLowerCase().trim()}:${title.toLowerCase().trim()}`;
  }

  public getUrl(artist: string, title: string): string | null {
    const key = this.createKey(artist, title);
    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() - item.timestamp > this.CACHE_EXPIRATION) {
      this.cache.delete(key);
      return null;
    }

    return item.url;
  }

  public setUrl(artist: string, title: string, url: string): void {
    const key = this.createKey(artist, title);
    this.cache.set(key, {
      url,
      timestamp: Date.now(),
    });
  }

  public loadFromStorage(): void {
    try {
      const savedCache = localStorage.getItem("spotifyUrlCache");
      if (savedCache) {
        const parsed = JSON.parse(savedCache);
        this.cache = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error(
        "Failed to load Spotify URL cache from localStorage",
        error
      );
      this.cache = new Map();
    }
  }

  public saveToStorage(): void {
    try {
      const cacheObject = Object.fromEntries(this.cache.entries());
      localStorage.setItem("spotifyUrlCache", JSON.stringify(cacheObject));
    } catch (error) {
      console.error("Failed to save Spotify URL cache to localStorage", error);
    }
  }
}

export const spotifyCache = new SpotifyUrlCache();

if (typeof window !== "undefined") {
  spotifyCache.loadFromStorage();

  window.addEventListener("beforeunload", () => {
    spotifyCache.saveToStorage();
  });
}
