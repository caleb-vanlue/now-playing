import { NextResponse } from "next/server";
import { applyUsernameMap } from "../../../../../utils/usernameMap";
import { serverCache, SESSIONS_CACHE_TTL } from "../../../../../utils/serverCache";
import { mapPlexSessions, PlexSession } from "../../../../../utils/plexApi";

const CACHE_KEY = "plex:sessions";

export async function GET() {
  const PLEX_URL = process.env.PLEX_URL;
  const PLEX_TOKEN = process.env.PLEX_TOKEN;

  if (!PLEX_URL || !PLEX_TOKEN) {
    return NextResponse.json(
      { error: "Plex configuration missing" },
      { status: 500 }
    );
  }

  const cached = serverCache.get<unknown>(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  try {
    const response = await fetch(
      `${PLEX_URL}/status/sessions?X-Plex-Token=${PLEX_TOKEN}`,
      {
        headers: {
          Accept: "application/json",
          "X-Plex-Client-Identifier": "NowPlaying-Dashboard",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Plex API Error: ${response.status}`);
    }

    const raw = await response.json();
    const sessions: PlexSession[] = raw?.MediaContainer?.Metadata || [];
    sessions.forEach((s) => {
      if (s.User?.title) s.User.title = applyUsernameMap(s.User.title);
    });

    // Build the response field-by-field so nothing unlisted (addresses, file
    // paths, device ids) can reach the client
    const data = mapPlexSessions(sessions);

    serverCache.set(CACHE_KEY, data, SESSIONS_CACHE_TTL);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching from Plex:", error);
    return NextResponse.json(
      { error: "Failed to fetch Plex data" },
      { status: 500 }
    );
  }
}
