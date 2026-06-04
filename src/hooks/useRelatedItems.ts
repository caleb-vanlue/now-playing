import { useState, useRef, useEffect } from "react";
import { BaseMedia, RelatedItem } from "../../types/media";

// Module-level cache keyed by startTime — one fetch per session card
const cache = new Map<string, RelatedItem[]>();

export function useRelatedItems(item: BaseMedia) {
  const cacheKey = item.startTime;
  const [items, setItems] = useState<RelatedItem[]>(() => cache.get(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !cache.has(cacheKey));
  const fetchedRef = useRef(cache.has(cacheKey));

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // For Jellyfin TV episodes, use the series ID — episode IDs return no similar results
    const jellyfinId =
      item.source === "jellyfin" && "seriesThumbId" in item
        ? ((item as { seriesThumbId?: string }).seriesThumbId ?? item.id)
        : item.id;

    const url =
      item.source === "plex"
        ? `/api/plex/related?ratingKey=${encodeURIComponent(item.id)}`
        : `/api/jellyfin/related?itemId=${encodeURIComponent(jellyfinId)}`;

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        const result: RelatedItem[] = data.items ?? [];
        cache.set(cacheKey, result);
        setItems(result);
      })
      .catch(() => {
        cache.set(cacheKey, []);
      })
      .finally(() => setLoading(false));
  }, [item.source, item.id, cacheKey]);

  return { items, loading };
}
