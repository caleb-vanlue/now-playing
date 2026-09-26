import { spotifyCache } from "./spotifyCache";
import { searchSpotifyTrack } from "./spotifyApi";

const pending = new Map<string, Promise<string | null>>();

/**
 * Resolves a Spotify track URL, backed by the persistent cache and
 * de-duplicating concurrent lookups for the same track.
 */
export function getSpotifyUrl(artist: string, trackTitle: string): Promise<string | null> {
  if (!artist || !trackTitle) return Promise.resolve(null);

  const cachedUrl = spotifyCache.getUrl(artist, trackTitle);
  if (cachedUrl !== null) return Promise.resolve(cachedUrl || null);

  const key = `${artist.trim().toLowerCase()}-${trackTitle.trim().toLowerCase()}`;
  const existing = pending.get(key);
  if (existing) return existing;

  const request = searchSpotifyTrack(artist, trackTitle)
    .then((result) => {
      const url = result.found && result.spotifyUrl ? result.spotifyUrl : "";
      spotifyCache.setUrl(artist, trackTitle, url);
      return url || null;
    })
    .catch((error) => {
      console.error("Error fetching Spotify URL:", error);
      return null;
    })
    .finally(() => pending.delete(key));

  pending.set(key, request);
  return request;
}
