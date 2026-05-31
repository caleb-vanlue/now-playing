import { MediaData, HistoryData, HistoryItem, BaseMedia } from "../types/media";
import { fetchPlexData, getThumbnailUrl as getPlexThumbnailUrl } from "./plexApi";
import { fetchJellyfinData, jellyfinThumbnailUrl } from "./jellyfinApi";

interface ServiceConfig {
  plex: boolean;
  jellyfin: boolean;
}

let configCache: ServiceConfig | null = null;

async function getServiceConfig(): Promise<ServiceConfig> {
  if (configCache) return configCache;
  try {
    const res = await fetch("/api/config");
    configCache = res.ok ? await res.json() : { plex: true, jellyfin: true };
  } catch {
    configCache = { plex: true, jellyfin: true };
  }
  return configCache!;
}

export async function fetchMediaData(signal?: AbortSignal): Promise<MediaData> {
  const config = await getServiceConfig();
  const results = await Promise.allSettled([
    config.plex ? fetchPlexData(signal) : Promise.resolve({ tracks: [], movies: [], episodes: [] }),
    config.jellyfin ? fetchJellyfinData(signal) : Promise.resolve({ tracks: [], movies: [], episodes: [] }),
  ]);

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

  const byStartTime = (a: BaseMedia, b: BaseMedia) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime();

  merged.tracks.sort(byStartTime);
  merged.movies.sort(byStartTime);
  merged.episodes.sort(byStartTime);

  return merged;
}

export async function fetchHistory(
  signal?: AbortSignal,
  limit = 100
): Promise<HistoryData> {
  const config = await getServiceConfig();
  const fetches: Promise<{ items: HistoryItem[] }>[] = [];
  if (config.plex) {
    fetches.push(
      fetch(`/api/plex/history?limit=${limit}`, { signal }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`Plex history: ${r.status}`))
      )
    );
  }
  if (config.jellyfin) {
    fetches.push(
      fetch(`/api/jellyfin/history?limit=${limit}`, { signal }).then((r) =>
        r.ok
          ? r.json()
          : Promise.reject(new Error(`Jellyfin history: ${r.status}`))
      )
    );
  }
  const results = await Promise.allSettled(fetches);

  const allItems = results.flatMap((result) => {
    if (result.status === "fulfilled") {
      return result.value.items || [];
    }
    return [];
  });

  // Sort merged history by viewedAt descending
  allItems.sort((a, b) => b.viewedAt - a.viewedAt);

  return { items: allItems.slice(0, limit) };
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
