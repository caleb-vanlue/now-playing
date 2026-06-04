import { NextResponse } from "next/server";
import { RelatedItem } from "../../../../../types/media";

interface JellyfinSimilarItem {
  Id: string;
  Name: string;
  ProductionYear?: number;
  Type: string;
  ImageTags?: { Primary?: string };
}

function jellyfinAuthHeader(apiKey: string): string {
  return `MediaBrowser Token="${apiKey}", Client="NowPlaying", Device="Server", DeviceId="now-playing-server", Version="1.0"`;
}

export async function GET(request: Request) {
  const JELLYFIN_URL = process.env.JELLYFIN_URL;
  const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY;

  if (!JELLYFIN_URL || !JELLYFIN_API_KEY) {
    return NextResponse.json({ error: "Jellyfin configuration missing" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  const headers = {
    Authorization: jellyfinAuthHeader(JELLYFIN_API_KEY),
    Accept: "application/json",
  };

  try {
    // userId is required for Jellyfin to scope Similar results to the library
    let userId: string | undefined;
    try {
      const usersRes = await fetch(`${JELLYFIN_URL}/Users`, { headers });
      if (usersRes.ok) {
        const users: { Id: string }[] = await usersRes.json();
        userId = users[0]?.Id;
      }
    } catch {
      // proceed without userId — may return empty results
    }

    const similarUrl = new URL(`${JELLYFIN_URL}/Items/${itemId}/Similar`);
    similarUrl.searchParams.set("limit", "15");
    similarUrl.searchParams.set("fields", "PrimaryImageAspectRatio");
    if (userId) similarUrl.searchParams.set("userId", userId);

    const res = await fetch(similarUrl.toString(), { headers });
    if (!res.ok) throw new Error(`Jellyfin API error: ${res.status}`);

    const data = await res.json();
    const jellyfinItems: JellyfinSimilarItem[] = data?.Items ?? [];

    const items: RelatedItem[] = jellyfinItems.map((item) => {
      const type: RelatedItem["type"] =
        item.Type === "Movie" ? "movie" : item.Type === "Series" ? "show" : "episode";
      const thumb = item.ImageTags?.Primary
        ? `/api/jellyfin/thumbnail?itemId=${item.Id}&imageType=Primary&quality=low&width=120`
        : undefined;

      return { id: item.Id, title: item.Name, year: item.ProductionYear, thumb, type, source: "jellyfin" };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching Jellyfin related content:", error);
    return NextResponse.json({ error: "Failed to fetch related content" }, { status: 500 });
  }
}
