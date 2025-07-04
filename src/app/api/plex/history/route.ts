import { NextResponse } from "next/server";

interface PlexHistoryItem {
  historyKey: string;
  key: string;
  ratingKey: string;
  librarySectionID: string;
  parentKey?: string;
  grandparentKey?: string;
  title: string;
  parentTitle?: string;
  grandparentTitle?: string;
  type: "movie" | "episode" | "track";
  thumb?: string;
  parentThumb?: string;
  grandparentThumb?: string;
  grandparentArt?: string;
  index?: number;
  parentIndex?: number;
  originallyAvailableAt?: string;
  viewedAt: number;
  accountID: number;
  deviceID: number;
  year?: number;
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
  const accountId = searchParams.get("accountId");
  const limit = searchParams.get("limit") || "100";
  const sort = searchParams.get("sort") || "viewedAt:desc";

  try {
    const params = new URLSearchParams({
      "X-Plex-Token": PLEX_TOKEN,
      sort,
      limit,
    });

    if (accountId) {
      params.append("accountId", accountId);
    }

    const response = await fetch(
      `${PLEX_URL}/status/sessions/history/all?${params}`,
      {
        headers: {
          Accept: "application/json",
          "X-Plex-Client-Identifier": "Plex-Dashboard",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Plex API Error: ${response.status}`);
    }

    const data = await response.json();

    const transformedData = {
      ...data,
      MediaContainer: {
        ...data.MediaContainer,
        Metadata:
          data.MediaContainer?.Metadata?.map((item: PlexHistoryItem) => {
            let displayTitle = item.title;
            let displaySubtitle = "";
            let thumbnailPath = "";

            if (item.type === "episode") {
              displayTitle = item.grandparentTitle || item.title;
              displaySubtitle = `S${item.parentIndex}:E${item.index} - ${item.title}`;
              thumbnailPath =
                item.thumb || item.grandparentThumb || item.parentThumb || "";
            } else if (item.type === "track") {
              displayTitle = item.title;
              displaySubtitle = item.grandparentTitle || item.parentTitle || "";
              thumbnailPath =
                item.parentThumb || item.grandparentThumb || item.thumb || "";
            } else if (item.type === "movie") {
              displayTitle = item.title;
              displaySubtitle = item.year ? `(${item.year})` : "";
              thumbnailPath = item.thumb || "";
            }

            let userName = "";
            switch (item.accountID) {
              case 1:
                userName = "Caleb";
                break;
              case 324439592:
                userName = "Matt";
                break;
              default:
                userName = `User ${item.accountID}`;
            }

            return {
              ...item,
              displayTitle,
              displaySubtitle,
              thumb: thumbnailPath,
              userName,
            };
          }) || [],
      },
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Error fetching Plex history:", error);
    return NextResponse.json(
      { error: "Failed to fetch Plex history" },
      { status: 500 }
    );
  }
}
