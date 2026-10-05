import {
  MediaData,
  HistoryData,
  HistoryItem,
  HistoryEntry,
  BaseMedia,
  Episode,
  Movie,
  SessionItem,
  SessionsResponse,
} from "../types/media";
import { fetchWithTimeout, isTimeoutError, getThumbnailUrl as getPlexThumbnailUrl } from "./plexApi";
import { jellyfinThumbnailUrl } from "./jellyfinApi";
import { MERGE_WINDOW_MS } from "./groupSessions";

interface ServiceConfig {
  plex: boolean;
  jellyfin: boolean;
}

let configPromise: Promise<ServiceConfig> | null = null;

// Shared by concurrent callers; a failure is not cached so the next poll retries
function getServiceConfig(): Promise<ServiceConfig> {
  configPromise ??= fetch("/api/config")
    .then((res) =>
      res.ok ? (res.json() as Promise<ServiceConfig>) : Promise.reject(new Error(`Config: ${res.status}`))
    )
    .catch((error) => {
      configPromise = null;
      throw error;
    });
  return configPromise;
}

const SOURCE_LABELS: Record<BaseMedia["source"], string> = {
  plex: "Plex",
  jellyfin: "Jellyfin",
};

// Stamp with the client clock so progress interpolates from receipt time
export function stampSessions(data: SessionsResponse): MediaData {
  const now = Date.now();
  const stamp = <T extends SessionItem<BaseMedia>>(item: T) => ({
    ...item,
    syncedAt: now,
    startTime: new Date(now - (item.viewOffset || 0)).toISOString(),
  });

  return {
    tracks: data.tracks.map(stamp),
    movies: data.movies.map(stamp),
    episodes: data.episodes.map(stamp),
  };
}

async function fetchSessions(
  source: BaseMedia["source"],
  signal?: AbortSignal
): Promise<MediaData> {
  const label = SOURCE_LABELS[source];
  try {
    const response = await fetchWithTimeout(`/api/${source}/sessions`, {
      headers: { Accept: "application/json" },
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `${label} API Error (${response.status}): ${errorText || "Unknown error"}`
      );
    }

    const data: SessionsResponse = await response.json();
    return stampSessions(data);
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(`Request timed out. The ${label} server may be unresponsive.`);
    }
    throw error;
  }
}

export async function fetchMediaData(signal?: AbortSignal): Promise<MediaData> {
  const config = await getServiceConfig();

  const configuredFetches: Promise<MediaData>[] = [];
  if (config.plex) configuredFetches.push(fetchSessions("plex", signal));
  if (config.jellyfin) configuredFetches.push(fetchSessions("jellyfin", signal));

  if (configuredFetches.length === 0) {
    return { tracks: [], movies: [], episodes: [] };
  }

  const results = await Promise.allSettled(configuredFetches);

  // A cancelled poll must surface as cancellation, not as partial data or a failure
  signal?.throwIfAborted();

  if (results.every((r) => r.status === "rejected")) {
    throw (results[0] as PromiseRejectedResult).reason;
  }

  const merged = results.reduce(
    (acc, result) => {
      if (result.status === "fulfilled") {
        acc.tracks.push(...result.value.tracks);
        acc.movies.push(...result.value.movies);
        acc.episodes.push(...result.value.episodes);
      }
      return acc;
    },
    { tracks: [], movies: [], episodes: [] } as MediaData
  );

  return merged;
}

const HISTORY_MAX = 250;


// Expects items sorted newest first
function mergeSimultaneousPlays(items: HistoryItem[]): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  const latestByKey = new Map<string, HistoryEntry>();

  for (const { userName, ...item } of items) {
    const key = `${item.source}:${item.id}`;
    // viewedAt is unix seconds
    const window =
      (item.type === "track" ? MERGE_WINDOW_MS.track : MERGE_WINDOW_MS.video) / 1000;
    const entry = latestByKey.get(key);

    if (entry && entry.viewedAt - item.viewedAt <= window) {
      if (!entry.userNames.includes(userName)) entry.userNames.push(userName);
      entry.playCount++;
      continue;
    }

    const created: HistoryEntry = { ...item, userNames: [userName], playCount: 1 };
    entries.push(created);
    latestByKey.set(key, created);
  }

  return entries;
}

export async function fetchHistory(
  signal?: AbortSignal,
  limit = 25
): Promise<HistoryData> {
  const clampedLimit = Math.min(limit, HISTORY_MAX);
  // Fetch one extra per source to detect whether more items exist
  const fetchLimit = clampedLimit + 1;

  const config = await getServiceConfig();
  const fetches: Promise<{ items: HistoryItem[] }>[] = [];
  if (config.plex) {
    fetches.push(
      fetch(`/api/plex/history?limit=${fetchLimit}`, { signal }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`Plex history: ${r.status}`))
      )
    );
  }
  if (config.jellyfin) {
    fetches.push(
      fetch(`/api/jellyfin/history?limit=${fetchLimit}`, { signal }).then((r) =>
        r.ok
          ? r.json()
          : Promise.reject(new Error(`Jellyfin history: ${r.status}`))
      )
    );
  }
  const results = await Promise.allSettled(fetches);

  const perSource = results.map((result) =>
    result.status === "fulfilled" ? result.value.items || [] : []
  );
  const allItems = perSource.flat();

  allItems.sort((a, b) => b.viewedAt - a.viewedAt);

  // Merge before paging so a page holds `limit` rows. Merging can shrink the list
  // below the limit, so a source that filled its fetch also means more exist.
  const entries = mergeSimultaneousPlays(allItems);
  const sourceTruncated = perSource.some((items) => items.length >= fetchLimit);
  const hasMore =
    (entries.length > clampedLimit || sourceTruncated) && clampedLimit < HISTORY_MAX;
  return { items: entries.slice(0, clampedLimit), hasMore };
}

export function getThumbnailUrl(
  item: Pick<BaseMedia, "source" | "thumbnailFileId">,
  options?: { quality?: "low" | "medium" | "high"; width?: number }
): string | null {
  if (!item.thumbnailFileId) return null;

  if (item.source === "jellyfin") {
    return jellyfinThumbnailUrl(
      item.thumbnailFileId,
      options?.quality || "medium",
      options?.width
    );
  }

  // Plex
  return getPlexThumbnailUrl(item.thumbnailFileId, {
    quality: options?.quality || "low",
    width: options?.width,
  });
}

export function getSeriesThumbnailUrl(episode: Pick<Episode, "source" | "seriesThumbId">): string | null {
  if (!episode.seriesThumbId) return null;
  if (episode.source === "jellyfin") {
    return jellyfinThumbnailUrl(episode.seriesThumbId, "high", 600);
  }
  return getPlexThumbnailUrl(episode.seriesThumbId, { quality: "high", width: 600 });
}

export function getMovieBackdropUrl(movie: Pick<Movie, "source" | "backdropPath">): string | null {
  if (!movie.backdropPath) return null;
  if (movie.source === "jellyfin") {
    return jellyfinThumbnailUrl(movie.backdropPath, "high", 1280, "Backdrop");
  }
  return getPlexThumbnailUrl(movie.backdropPath, { quality: "high", width: 1280 });
}

export function getResponsiveThumbnailUrl(
  item: Pick<BaseMedia, "source" | "thumbnailFileId">,
  type: "music" | "movie" | "tv"
): string | null {
  if (!item.thumbnailFileId) return null;

  const sizes: Record<string, { quality: "low" | "medium" | "high"; width: number }> = {
    music: { quality: "high", width: 500 },
    movie: { quality: "high", width: 600 },
    tv: { quality: "medium", width: 800 },
  };

  return getThumbnailUrl(item, sizes[type]);
}
