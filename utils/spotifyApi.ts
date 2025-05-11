import axios from "axios";

interface SpotifySearchResult {
  found: boolean;
  spotifyUrl?: string;
  trackName?: string;
  artistName?: string;
  error?: string;
}

export async function searchSpotifyTrack(
  artist: string,
  title: string
): Promise<SpotifySearchResult> {
  try {
    const response = await axios.get<SpotifySearchResult>(
      "/api/spotify/search",
      {
        params: {
          artist,
          title,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error searching Spotify:", error);
    return { found: false, error: "Failed to search Spotify" };
  }
}

class SpotifyUrlCache {
  private cache: Map<string, string> = new Map();

  private createKey(artist: string, title: string): string {
    return `${artist.toLowerCase().trim()}:${title.toLowerCase().trim()}`;
  }

  public getUrl(artist: string, title: string): string | null {
    const key = this.createKey(artist, title);
    return this.cache.get(key) || null;
  }

  public setUrl(artist: string, title: string, url: string | null): void {
    const key = this.createKey(artist, title);
    if (url) {
      this.cache.set(key, url);
    } else {
      this.cache.set(key, "");
    }
  }
}

export const spotifyCache = new SpotifyUrlCache();
