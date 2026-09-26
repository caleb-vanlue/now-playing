import { useState, useEffect, useRef } from "react";
import { getSpotifyUrl } from "../../utils/spotifyLookup";

export function useSpotifyTrack(artist: string, trackTitle: string) {
  const [spotifyUrl, setSpotifyUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const searchKeyRef = useRef<string>(`${artist}:${trackTitle}`);
  const hasSearchedRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!artist || !trackTitle) return;

    const currentSearchKey = `${artist}:${trackTitle}`;

    if (currentSearchKey !== searchKeyRef.current) {
      searchKeyRef.current = currentSearchKey;
      hasSearchedRef.current = false;
    }

    if (hasSearchedRef.current) return;

    abortControllerRef.current = new AbortController();
    const abortController = abortControllerRef.current;

    async function lookupTrack() {
      if (abortController.signal.aborted) return;

      setIsLoading(true);
      setError(null);

      try {
        const url = await getSpotifyUrl(artist, trackTitle);
        
        if (abortController.signal.aborted) return;
        
        setSpotifyUrl(url);
      } catch (err) {
        if (abortController.signal.aborted) return;
        
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setSpotifyUrl(null);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
          hasSearchedRef.current = true;
        }
      }
    }

    lookupTrack();

    return () => {
      abortController.abort();
    };
  }, [artist, trackTitle]);

  return { spotifyUrl, isLoading, error };
}
