import { NextResponse } from "next/server";
import { HistoryItem } from "../../../../../types/media";

interface JellyfinUser {
  Id: string;
  Name: string;
}

interface JellyfinHistoryItem {
  Id: string;
  Name: string;
  Type: string;
  SeriesName?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  ProductionYear?: number;
  ImageTags?: { Primary?: string };
  UserData?: {
    LastPlayedDate?: string;
    Played?: boolean;
  };
}

function jellyfinAuthHeader(apiKey: string): string {
  return `MediaBrowser Token="${apiKey}", Client="NowPlaying", Device="Server", DeviceId="now-playing-server", Version="1.0"`;
}

export async function GET(request: Request) {
  const JELLYFIN_URL = process.env.JELLYFIN_URL;
  const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY;

  if (!JELLYFIN_URL || !JELLYFIN_API_KEY) {
    return NextResponse.json(
      { error: "Jellyfin configuration missing" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "100");

  try {
    const headers = {
      Authorization: jellyfinAuthHeader(JELLYFIN_API_KEY),
      Accept: "application/json",
    };

    // Get all users on the server
    const usersRes = await fetch(`${JELLYFIN_URL}/Users`, { headers });
    if (!usersRes.ok) {
      throw new Error(`Jellyfin users API error: ${usersRes.status}`);
    }
    const users: JellyfinUser[] = await usersRes.json();

    // Fetch recently played items for each user in parallel
    const perUserItems = await Promise.all(
      users.map(async (user) => {
        try {
          const res = await fetch(
            `${JELLYFIN_URL}/Users/${user.Id}/Items?Filters=IsPlayed&SortBy=DatePlayed&SortOrder=Descending&Limit=${limit}&IncludeItemTypes=Movie,Episode,Audio&Recursive=true&Fields=Overview,ProductionYear,UserData,ImageTags`,
            { headers }
          );
          if (!res.ok) return [];
          const data = await res.json();
          return (data.Items || []).map((item: JellyfinHistoryItem) => ({
            item,
            userName: user.Name,
          }));
        } catch {
          return [];
        }
      })
    );

    // Flatten, sort by LastPlayedDate descending, take top N
    const allItems = perUserItems.flat() as {
      item: JellyfinHistoryItem;
      userName: string;
    }[];

    allItems.sort((a, b) => {
      const dateA = a.item.UserData?.LastPlayedDate
        ? new Date(a.item.UserData.LastPlayedDate).getTime()
        : 0;
      const dateB = b.item.UserData?.LastPlayedDate
        ? new Date(b.item.UserData.LastPlayedDate).getTime()
        : 0;
      return dateB - dateA;
    });

    const topItems = allItems.slice(0, limit);

    const historyItems: HistoryItem[] = topItems.map(({ item, userName }) => {
      const lastPlayedDate = item.UserData?.LastPlayedDate;
      const viewedAt = lastPlayedDate
        ? Math.floor(new Date(lastPlayedDate).getTime() / 1000)
        : 0;

      const jellyfinType = item.Type;
      let type: "movie" | "episode" | "track";
      let displayTitle: string;
      let displaySubtitle: string;

      if (jellyfinType === "Episode") {
        type = "episode";
        displayTitle = item.SeriesName || item.Name;
        displaySubtitle =
          item.ParentIndexNumber !== undefined &&
          item.IndexNumber !== undefined
            ? `S${item.ParentIndexNumber}:E${item.IndexNumber} - ${item.Name}`
            : item.Name;
      } else if (jellyfinType === "Audio") {
        type = "track";
        displayTitle = item.Name;
        displaySubtitle = item.SeriesName || "";
      } else {
        type = "movie";
        displayTitle = item.Name;
        displaySubtitle = item.ProductionYear ? `(${item.ProductionYear})` : "";
      }

      const thumb = item.ImageTags?.Primary
        ? `/api/jellyfin/thumbnail?itemId=${item.Id}&imageType=Primary&quality=low&width=100`
        : undefined;

      return {
        id: item.Id,
        source: "jellyfin" as const,
        type,
        displayTitle,
        displaySubtitle,
        thumb,
        viewedAt,
        userName,
      };
    });

    return NextResponse.json({ items: historyItems });
  } catch (error) {
    console.error("Error fetching Jellyfin history:", error);
    return NextResponse.json(
      { error: "Failed to fetch Jellyfin history" },
      { status: 500 }
    );
  }
}
