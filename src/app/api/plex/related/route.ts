import { NextResponse } from "next/server";
import { RelatedItem } from "../../../../../types/media";
import { serverCache, RELATED_CACHE_TTL } from "../../../../../utils/serverCache";

interface PlexMetadata {
  ratingKey: string;
  title: string;
  year?: number;
  thumb?: string;
  type: string;
}

interface PlexHub {
  Metadata?: PlexMetadata[];
}

export async function GET(request: Request) {
  const PLEX_URL = process.env.PLEX_URL;
  const PLEX_TOKEN = process.env.PLEX_TOKEN;

  if (!PLEX_URL || !PLEX_TOKEN) {
    return NextResponse.json({ error: "Plex configuration missing" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const ratingKey = searchParams.get("ratingKey");
  if (!ratingKey) {
    return NextResponse.json({ error: "ratingKey required" }, { status: 400 });
  }

  const cacheKey = `plex:related:${ratingKey}`;
  const cached = serverCache.get<{ items: RelatedItem[] }>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const res = await fetch(
      `${PLEX_URL}/library/metadata/${ratingKey}/related?X-Plex-Token=${PLEX_TOKEN}&excludeFields=summary&limit=20`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) throw new Error(`Plex API error: ${res.status}`);

    const data = await res.json();
    const hubs: PlexHub[] = data?.MediaContainer?.Hub ?? [];

    const seen = new Set<string>([ratingKey]);
    const items: RelatedItem[] = [];

    for (const hub of hubs) {
      for (const meta of hub.Metadata ?? []) {
        if (seen.has(meta.ratingKey)) continue;
        seen.add(meta.ratingKey);

        const type: RelatedItem["type"] =
          meta.type === "movie" ? "movie" : meta.type === "show" ? "show" : "episode";
        const thumb = meta.thumb
          ? `/api/plex/thumbnail?path=${encodeURIComponent(meta.thumb)}&quality=low&width=120`
          : undefined;

        items.push({ id: meta.ratingKey, title: meta.title, year: meta.year, thumb, type, source: "plex" });
        if (items.length >= 15) break;
      }
      if (items.length >= 15) break;
    }

    serverCache.set(cacheKey, { items }, RELATED_CACHE_TTL);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching Plex related content:", error);
    return NextResponse.json({ error: "Failed to fetch related content" }, { status: 500 });
  }
}
