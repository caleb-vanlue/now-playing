import type { BaseMedia, MediaData } from "../types/media";

// Fields that differ on every poll without the item meaningfully changing
const VOLATILE_KEYS = new Set<string>(["syncedAt", "startTime"]);

function isDeepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) =>
    isDeepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key]
    )
  );
}

function isSameItem<T extends BaseMedia>(prev: T, next: T): boolean {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    if (VOLATILE_KEYS.has(key)) continue;
    if (!isDeepEqual(prev[key as keyof T], next[key as keyof T])) return false;
  }
  return true;
}

function byStartTime(a: BaseMedia, b: BaseMedia): number {
  return a.startTime.localeCompare(b.startTime) || a.sessionId.localeCompare(b.sessionId);
}

function reconcileList<T extends BaseMedia>(prev: T[], next: T[]): T[] {
  const prevBySession = new Map(prev.map((item) => [item.sessionId, item]));

  const merged = next.map((item) => {
    const old = prevBySession.get(item.sessionId);
    // Different media within the same session (e.g. next track in a queue) is a new item
    if (!old || old.id !== item.id) return item;

    // Adapters estimate startTime as `now - viewOffset`, which drifts while paused.
    // Keep the first estimate so ordering and "started" labels stay stable.
    if (isSameItem(old, item)) return old;
    return { ...item, startTime: old.startTime };
  });

  merged.sort(byStartTime);

  const unchanged =
    merged.length === prev.length && merged.every((item, i) => item === prev[i]);
  return unchanged ? prev : merged;
}

/**
 * Merges a fresh poll into the previous snapshot with structural sharing:
 * unchanged items, lists, and the snapshot itself keep their identity so
 * memoized consumers skip re-rendering. An item whose server-reported state
 * is unchanged (e.g. a cached response) keeps its old `syncedAt`, so client
 * progress interpolation continues instead of snapping back.
 */
export function reconcileMediaData(prev: MediaData | null, next: MediaData): MediaData {
  if (!prev) {
    return {
      tracks: [...next.tracks].sort(byStartTime),
      movies: [...next.movies].sort(byStartTime),
      episodes: [...next.episodes].sort(byStartTime),
    };
  }

  const tracks = reconcileList(prev.tracks, next.tracks);
  const movies = reconcileList(prev.movies, next.movies);
  const episodes = reconcileList(prev.episodes, next.episodes);

  if (tracks === prev.tracks && movies === prev.movies && episodes === prev.episodes) {
    return prev;
  }
  return { tracks, movies, episodes };
}

export function hasActivePlayback(data: MediaData | null): boolean {
  if (!data) return false;
  return (
    data.tracks.some((t) => t.state === "playing") ||
    data.movies.some((m) => m.state === "playing") ||
    data.episodes.some((e) => e.state === "playing")
  );
}
