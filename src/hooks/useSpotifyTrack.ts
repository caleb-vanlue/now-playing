import { useState, useEffect } from "react";
import { getSpotifyUrl } from "../../utils/spotifyLookup";

/**
 * Spotify URL for a track. The result is tagged with the track it belongs to,
 * so a card whose session moves to the next song never shows the previous link.
 */
export function useSpotifyTrack(artist: string, trackTitle: string): string | null {
  const key = `${artist}\u0000${trackTitle}`;
  const [resolved, setResolved] = useState<{ key: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!artist || !trackTitle) return;

    let cancelled = false;
    getSpotifyUrl(artist, trackTitle).then((url) => {
      if (!cancelled) setResolved({ key, url });
    });

    return () => {
      cancelled = true;
    };
  }, [artist, trackTitle, key]);

  return resolved?.key === key ? resolved.url : null;
}
