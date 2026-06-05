import { NextResponse } from "next/server";
import { HistoryItem } from "../../../../../types/media";
import { applyUsernameMap } from "../../../../../utils/usernameMap";
import { serverCache, HISTORY_CACHE_TTL } from "../../../../../utils/serverCache";

interface PlexHistoryItem {
  ratingKey: string;
  title: string;
  parentTitle?: string;
  grandparentTitle?: string;
  type: "movie" | "episode" | "track";
  thumb?: string;
  parentThumb?: string;
  grandparentThumb?: string;
  index?: number;
  parentIndex?: number;
  viewedAt: number;
  accountID: number;
  year?: number;
}

interface PlexAccount {
  id: number;
  name: string;
}

async function fetchAccountMap(
  plexUrl: string,
  plexToken: string
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const res = await fetch(
      `${plexUrl}/accounts?X-Plex-Token=${plexToken}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return map;
    const data = await res.json();
    const accounts: PlexAccount[] =
      data?.MediaContainer?.Account || [];
    accounts.forEach((a) => map.set(a.id, a.name));
  } catch {
    // fall through — map stays empty, unknown user fallback applies
  }
  return map;
}

export async function GET(request: Request) {
  const PLEX_URL = process.env.PLEX_URL;
  const PLEX_TOKEN = process.env.PLEX_TOKEN;

  if (!PLEX_URL || !PLEX_TOKEN) {
    return NextResponse.json(
      { error: "Plex configuration missing" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || "100";
  const sort = searchParams.get("sort") || "viewedAt:desc";

  const cacheKey = `plex:history:${limit}:${sort}`;
  const cached = serverCache.get<unknown>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const [historyRes, accountMap] = await Promise.all([
      fetch(
        `${PLEX_URL}/status/sessions/history/all?X-Plex-Token=${PLEX_TOKEN}&sort=${sort}&limit=${limit}`,
        { headers: { Accept: "application/json" } }
      ),
      fetchAccountMap(PLEX_URL, PLEX_TOKEN),
    ]);

    if (!historyRes.ok) {
      throw new Error(`Plex API Error: ${historyRes.status}`);
    }

    const data = await historyRes.json();

    const items: HistoryItem[] = (
      data.MediaContainer?.Metadata || []
    ).map((item: PlexHistoryItem) => {
      let displayTitle = item.title;
      let displaySubtitle = "";
      let thumb = "";

      if (item.type === "episode") {
        displayTitle = item.grandparentTitle || item.title;
        displaySubtitle = `S${item.parentIndex}:E${item.index} - ${item.title}`;
        thumb = item.thumb || item.grandparentThumb || item.parentThumb || "";
      } else if (item.type === "track") {
        displayTitle = item.title;
        displaySubtitle = item.grandparentTitle || item.parentTitle || "";
        thumb = item.parentThumb || item.grandparentThumb || item.thumb || "";
      } else {
        displayTitle = item.title;
        displaySubtitle = item.year ? `(${item.year})` : "";
        thumb = item.thumb || "";
      }

      const thumbUrl = thumb
        ? `/api/plex/thumbnail?path=${encodeURIComponent(thumb)}&quality=low&width=100`
        : undefined;

      return {
        id: item.ratingKey,
        source: "plex" as const,
        type: item.type,
        displayTitle,
        displaySubtitle,
        thumb: thumbUrl,
        viewedAt: item.viewedAt,
        userName: applyUsernameMap(accountMap.get(item.accountID) || "Unknown User"),
      };
    });

    serverCache.set(cacheKey, { items }, HISTORY_CACHE_TTL);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching Plex history:", error);
    return NextResponse.json(
      { error: "Failed to fetch Plex history" },
      { status: 500 }
    );
  }
}
