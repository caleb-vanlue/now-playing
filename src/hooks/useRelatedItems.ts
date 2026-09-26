import { useState, useEffect } from "react";
import { BaseMedia, Episode, RelatedItem } from "../../types/media";

// Module-level cache keyed by the looked-up media, shared across cards and reopenings
const cache = new Map<string, RelatedItem[]>();
const inFlight = new Map<string, Promise<RelatedItem[]>>();
const EMPTY: RelatedItem[] = [];

type RelatedSource = Pick<BaseMedia, "source" | "id"> &
  Partial<Pick<Episode, "seriesRatingKey" | "seriesThumbId">>;

// For TV episodes, use the series ID — episode IDs return no similar results
function getLookupId(item: RelatedSource): string {
  if (item.source === "plex") return item.seriesRatingKey ?? item.id;
  return item.seriesThumbId ?? item.id;
}

function fetchRelated(source: BaseMedia["source"], lookupId: string, cacheKey: string) {
  const cached = cache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const url =
    source === "plex"
      ? `/api/plex/related?ratingKey=${encodeURIComponent(lookupId)}`
      : `/api/jellyfin/related?itemId=${encodeURIComponent(lookupId)}`;

  const promise = fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Related: ${r.status}`))))
    .then((data: { items?: RelatedItem[] }) => {
      const items = data.items ?? EMPTY;
      cache.set(cacheKey, items);
      return items;
    })
    // Failures aren't cached, so reopening the details retries
    .catch(() => EMPTY)
    .finally(() => inFlight.delete(cacheKey));

  inFlight.set(cacheKey, promise);
  return promise;
}

export function useRelatedItems(item: RelatedSource) {
  const { source } = item;
  const lookupId = getLookupId(item);
  const cacheKey = `${source}:${lookupId}`;
  const [resolved, setResolved] = useState<{ key: string; items: RelatedItem[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRelated(source, lookupId, cacheKey).then((items) => {
      if (!cancelled) setResolved({ key: cacheKey, items });
    });
    return () => {
      cancelled = true;
    };
  }, [source, lookupId, cacheKey]);

  const items =
    cache.get(cacheKey) ?? (resolved?.key === cacheKey ? resolved.items : null);

  return { items: items ?? EMPTY, loading: items === null };
}
