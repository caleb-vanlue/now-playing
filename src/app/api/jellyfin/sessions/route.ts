import { NextResponse } from "next/server";
import { applyUsernameMap } from "../../../../../utils/usernameMap";
import { serverCache, SESSIONS_CACHE_TTL } from "../../../../../utils/serverCache";
import {
  mapJellyfinSessions,
  EnrichedSession,
  JellyfinItemDetail,
  JellyfinSession,
} from "../../../../../utils/jellyfinApi";

const CACHE_KEY = "jellyfin:sessions";

function jellyfinAuthHeader(apiKey: string): string {
  return `MediaBrowser Token="${apiKey}", Client="NowPlaying", Device="Server", DeviceId="now-playing-server", Version="1.0"`;
}

async function fetchItemDetail(
  jellyfinUrl: string,
  apiKey: string,
  userId: string,
  itemId: string,
): Promise<JellyfinItemDetail> {
  try {
    const fields =
      "People,Genres,Studios,Overview,ProductionYear,OfficialRating,CommunityRating,Taglines";
    const res = await fetch(
      `${jellyfinUrl}/Users/${userId}/Items/${itemId}?fields=${fields}`,
      { headers: { Authorization: jellyfinAuthHeader(apiKey) } },
    );
    if (!res.ok) {
      console.warn(`Jellyfin detail fetch failed for item ${itemId}: ${res.status}`);
      return {};
    }
    return res.json();
  } catch (err) {
    console.warn(`Jellyfin detail fetch error for item ${itemId}:`, err);
    return {};
  }
}

export async function GET() {
  const JELLYFIN_URL = process.env.JELLYFIN_URL;
  const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY;

  if (!JELLYFIN_URL || !JELLYFIN_API_KEY) {
    return NextResponse.json(
      { error: "Jellyfin configuration missing" },
      { status: 500 },
    );
  }

  const cached = serverCache.get<unknown>(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  try {
    const res = await fetch(`${JELLYFIN_URL}/Sessions`, {
      headers: {
        Authorization: jellyfinAuthHeader(JELLYFIN_API_KEY),
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Jellyfin API Error: ${res.status}`);
    }

    const sessions: JellyfinSession[] = await res.json();
    const activeSessions = sessions.filter(
      (s): s is EnrichedSession["session"] => !!s.IsActive && s.NowPlayingItem != null,
    );

    const enriched: EnrichedSession[] = await Promise.all(
      activeSessions.map(async (session) => {
        const item = session.NowPlayingItem;
        const detail = await fetchItemDetail(
          JELLYFIN_URL,
          JELLYFIN_API_KEY,
          session.UserId,
          item.Id,
        );

        if (item.Type === "Episode" && item.SeriesId) {
          const seriesDetail = await fetchItemDetail(
            JELLYFIN_URL,
            JELLYFIN_API_KEY,
            session.UserId,
            item.SeriesId,
          );
          if (seriesDetail.People?.length) {
            detail.People = seriesDetail.People;
          }
        }

        return {
          session: {
            ...session,
            UserName: session.UserName && applyUsernameMap(session.UserName),
          },
          detail,
        };
      }),
    );

    // Build the response field-by-field so nothing unlisted (endpoints, file
    // paths, device ids) can reach the client
    const data = mapJellyfinSessions(enriched);

    serverCache.set(CACHE_KEY, data, SESSIONS_CACHE_TTL);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching from Jellyfin:", error);
    return NextResponse.json(
      { error: "Failed to fetch Jellyfin sessions" },
      { status: 500 },
    );
  }
}
