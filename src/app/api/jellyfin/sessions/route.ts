import { NextResponse } from "next/server";
import { describeClient, monitor } from "../../../../../utils/monitor";
import { serverCache, SESSIONS_CACHE_TTL } from "../../../../../utils/serverCache";
import { fetchJellyfinSessions } from "../../../../../utils/sessionSources";

const CACHE_KEY = "jellyfin:sessions";

export async function GET(request: Request) {
  // Browsers only call this when the live stream is unavailable
  monitor.recordPoll(describeClient(request));

  if (!process.env.JELLYFIN_URL || !process.env.JELLYFIN_API_KEY) {
    return NextResponse.json(
      { error: "Jellyfin configuration missing" },
      { status: 500 },
    );
  }

  const cached = serverCache.get<unknown>(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  try {
    const data = await fetchJellyfinSessions();
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
