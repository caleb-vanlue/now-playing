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
  title: string,
  signal?: AbortSignal
): Promise<SpotifySearchResult> {
  try {
    const response = await axios.get<SpotifySearchResult>(
      "/api/spotify/search",
      {
        params: {
          artist,
          title,
        },
        signal,
        timeout: 10000,
      }
    );

    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error("Request cancelled");
    }
    console.error("Error searching Spotify:", error);
    return { found: false, error: "Failed to search Spotify" };
  }
}
