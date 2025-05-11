import { useState, useEffect, useRef } from "react";
import { spotifyCache, searchSpotifyTrack } from "../../utils/spotifyApi";

export function useSpotifyTrack(artist: string, trackTitle: string) {
  const [spotifyUrl, setSpotifyUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const searchKeyRef = useRef<string>(`${artist}:${trackTitle}`);
  const hasSearchedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!artist || !trackTitle) return;

    const currentSearchKey = `${artist}:${trackTitle}`;

    if (currentSearchKey !== searchKeyRef.current) {
      searchKeyRef.current = currentSearchKey;
      hasSearchedRef.current = false;
    }

    if (hasSearchedRef.current) return;

    async function lookupTrack() {
      const cachedUrl = spotifyCache.getUrl(artist, trackTitle);
      if (cachedUrl !== null) {
        setSpotifyUrl(cachedUrl || null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await searchSpotifyTrack(artist, trackTitle);

        if (result.found && result.spotifyUrl) {
          setSpotifyUrl(result.spotifyUrl);
          spotifyCache.setUrl(artist, trackTitle, result.spotifyUrl);
        } else {
          setSpotifyUrl(null);
          spotifyCache.setUrl(artist, trackTitle, null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setSpotifyUrl(null);
      } finally {
        setIsLoading(false);
        hasSearchedRef.current = true;
      }
    }

    lookupTrack();
  }, [artist, trackTitle]);

  return { spotifyUrl, isLoading, error };
}
