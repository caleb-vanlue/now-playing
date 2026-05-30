import { NextResponse } from "next/server";
import { applyUsernameMap } from "../../../../../utils/usernameMap";

function sanitizePlexSession(session: Record<string, unknown>): void {
  if (session.User && typeof session.User === "object") {
    const user = session.User as Record<string, unknown>;
    if (user.title) {
      user.title = applyUsernameMap(String(user.title));
    }
  }

  if (session.Player && typeof session.Player === "object") {
    const player = session.Player as Record<string, unknown>;
    delete player.address;
    delete player.remotePublicAddress;
    delete player.machineIdentifier;
    delete player.token;
  }

  if (session.Session && typeof session.Session === "object") {
    const s = session.Session as Record<string, unknown>;
    delete s.Location;
  }

  const media = session.Media as Array<Record<string, unknown>> | undefined;
  media?.forEach((m) => {
    const parts = m.Part as Array<Record<string, unknown>> | undefined;
    parts?.forEach((part) => {
      delete part.file;
      delete part.key;
    });
  });
}

export async function GET() {
  const PLEX_URL = process.env.PLEX_URL;
  const PLEX_TOKEN = process.env.PLEX_TOKEN;

  if (!PLEX_URL || !PLEX_TOKEN) {
    return NextResponse.json(
      { error: "Plex configuration missing" },
      { status: 500 }
    );
  }

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

    const data = await response.json();
    const sessions: Record<string, unknown>[] = data?.MediaContainer?.Metadata || [];
    sessions.forEach(sanitizePlexSession);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching from Plex:", error);
    return NextResponse.json(
      { error: "Failed to fetch Plex data" },
      { status: 500 }
    );
  }
}
