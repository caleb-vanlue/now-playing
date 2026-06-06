import { useState, useEffect } from "react";
import { Track } from "../../types/media";

interface LyricsResult {
  lyrics: string | null;
  instrumental: boolean;
}

const cache = new Map<string, LyricsResult>();
const inFlight = new Map<string, Promise<LyricsResult>>();

function buildCacheKey(track: Pick<Track, "artist" | "title" | "album">): string {
  return `${track.artist}|${track.title}|${track.album ?? ""}`;
}

function buildParams(track: Track): URLSearchParams {
  const params = new URLSearchParams({ artist: track.artist, title: track.title });
  if (track.album) params.set("album", track.album);
  if (track.duration) params.set("duration", String(Math.round(track.duration / 1000)));
  return params;
}

function fetchLyrics(track: Track): Promise<LyricsResult> {
  const cacheKey = buildCacheKey(track);

  const cached = cache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const promise = fetch(`/api/lyrics?${buildParams(track)}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((data): LyricsResult => ({
      lyrics: data.lyrics ?? null,
      instrumental: data.instrumental ?? false,
    }))
    .catch((): LyricsResult => ({ lyrics: null, instrumental: false }))
    .then((result) => {
      cache.set(cacheKey, result);
      inFlight.delete(cacheKey);
      return result;
    });

  inFlight.set(cacheKey, promise);
  return promise;
}

export function prefetchLyrics(track: Track): void {
  fetchLyrics(track);
}

export function useLyrics(track: Track) {
  const cacheKey = buildCacheKey(track);
  const [result, setResult] = useState<LyricsResult>(
    () => cache.get(cacheKey) ?? { lyrics: null, instrumental: false }
  );
  const [loading, setLoading] = useState(() => !cache.has(cacheKey));

  useEffect(() => {
    if (cache.has(cacheKey)) {
      setResult(cache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetchLyrics(track).then((resolved) => {
      if (!cancelled) {
        setResult(resolved);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...result, loading };
}
