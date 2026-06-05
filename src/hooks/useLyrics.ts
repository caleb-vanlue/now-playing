import { useState, useRef, useEffect } from "react";
import { Track } from "../../types/media";

interface LyricsResult {
  lyrics: string | null;
  instrumental: boolean;
}

const cache = new Map<string, LyricsResult>();

export function useLyrics(track: Track) {
  const cacheKey = track.startTime;
  const [result, setResult] = useState<LyricsResult>(
    () => cache.get(cacheKey) ?? { lyrics: null, instrumental: false }
  );
  const [loading, setLoading] = useState(() => !cache.has(cacheKey));
  const fetchedRef = useRef(cache.has(cacheKey));

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const params = new URLSearchParams({
      artist: track.artist,
      title: track.title,
    });
    if (track.album) params.set("album", track.album);
    if (track.duration) params.set("duration", String(Math.round(track.duration / 1000)));

    fetch(`/api/lyrics?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        const resolved: LyricsResult = {
          lyrics: data.lyrics ?? null,
          instrumental: data.instrumental ?? false,
        };
        cache.set(cacheKey, resolved);
        setResult(resolved);
      })
      .catch(() => {
        const fallback: LyricsResult = { lyrics: null, instrumental: false };
        cache.set(cacheKey, fallback);
      })
      .finally(() => setLoading(false));
  }, [track.artist, track.title, track.album, track.duration, cacheKey]);

  return { ...result, loading };
}
