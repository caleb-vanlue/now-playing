import { NextResponse } from "next/server";
import { describeClient, monitor } from "../../../../../utils/monitor";
import { serverCache, SESSIONS_CACHE_TTL } from "../../../../../utils/serverCache";
import { getPlexConfig, PlexAuthError } from "../../../../../utils/plexConfig";
import { fetchPlexSessions } from "../../../../../utils/sessionSources";

const CACHE_KEY = "plex:sessions";

export async function GET(request: Request) {
  // Browsers only call this when the live stream is unavailable
  monitor.recordPoll(describeClient(request));

  if (!getPlexConfig()) {
    return NextResponse.json(
      { error: "Plex configuration missing" },
      { status: 500 }
    );
  }

  const cached = serverCache.get<unknown>(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  try {
    const data = await fetchPlexSessions();
    serverCache.set(CACHE_KEY, data, SESSIONS_CACHE_TTL);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof PlexAuthError) {
      // Polling clients show "signed out" rather than "unreachable" from this
      return NextResponse.json({ error: "Plex sign-in needed", reason: "unauthorized" }, { status: 503 });
    }
    console.error("Error fetching from Plex:", error);
    return NextResponse.json(
      { error: "Failed to fetch Plex data" },
      { status: 500 }
    );
  }
}
