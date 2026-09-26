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
  const [resolved, setResolved] = useState<{ key: string; result: LyricsResult } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Always subscribe: a prefetch may finish between render and this effect.
    // fetchLyrics serves cached/in-flight results, so re-running is cheap.
    fetchLyrics(track).then((result) => {
      if (!cancelled) setResolved({ key: cacheKey, result });
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, track]);

  // Module cache entries are immutable once written, so reading it during render is safe
  const result =
    cache.get(cacheKey) ?? (resolved?.key === cacheKey ? resolved.result : null);

  return {
    lyrics: result?.lyrics ?? null,
    instrumental: result?.instrumental ?? false,
    loading: result === null,
  };
}
