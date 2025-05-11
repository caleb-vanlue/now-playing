import { useState, useEffect, useRef } from "react";
import { useMediaDataContext } from "../components/MediaDataContext";

export function useSpotifyTrack(artist: string, trackTitle: string) {
  const [spotifyUrl, setSpotifyUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { getSpotifyUrl } = useMediaDataContext();

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
      setIsLoading(true);
      setError(null);

      try {
        const url = await getSpotifyUrl(artist, trackTitle);
        setSpotifyUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setSpotifyUrl(null);
      } finally {
        setIsLoading(false);
        hasSearchedRef.current = true;
      }
    }

    lookupTrack();
  }, [artist, trackTitle, getSpotifyUrl]);

  return { spotifyUrl, error };
}
