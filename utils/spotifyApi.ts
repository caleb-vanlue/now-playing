import { fetchWithTimeout } from "./plexApi";

interface SpotifySearchResult {
  found: boolean;
  spotifyUrl?: string;
  trackName?: string;
  artistName?: string;
  error?: string;
}

export async function searchSpotifyTrack(
  artist: string,
  title: string,
  signal?: AbortSignal
): Promise<SpotifySearchResult> {
  try {
    const params = new URLSearchParams({ artist, title });
    const response = await fetchWithTimeout(
      `/api/spotify/search?${params}`,
      { signal },
      10000
    );

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (signal?.aborted) {
      throw new Error("Request cancelled");
    }
    console.error("Error searching Spotify:", error);
    return { found: false, error: "Failed to search Spotify" };
  }
}
