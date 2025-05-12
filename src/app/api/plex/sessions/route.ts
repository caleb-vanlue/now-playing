import { NextResponse } from "next/server";

function sanitizeUserData(user: any) {
  if (!user) return user;
  return {
    title: user.title,
  };
}

function sanitizePlayerData(player: any) {
  if (!player) return player;
  return {
    device: player.device,
    model: player.model,
    platform: player.platform,
    platformVersion: player.platformVersion,
    product: player.product,
    profile: player.profile,
    state: player.state,
    title: player.title,
    version: player.version,
    vendor: player.vendor,
    local: player.local,
    relayed: player.relayed,
    secure: player.secure,
  };
}

function sanitizeSessionData(session: any) {
  if (!session) return session;
  return {
    bandwidth: session.bandwidth,
    location: session.location,
  };
}

function sanitizeTranscodeSessionData(transcodeSession: any) {
  if (!transcodeSession) return transcodeSession;
  const { key, ...safeData } = transcodeSession;
  return safeData;
}

function sanitizeMediaData(data: any) {
  if (!data?.MediaContainer?.Metadata) return data;

  return {
    ...data,
    MediaContainer: {
      ...data.MediaContainer,
      Metadata: data.MediaContainer.Metadata.map((item: any) => ({
        ...item,
        User: sanitizeUserData(item.User),
        Player: sanitizePlayerData(item.Player),
        Session: sanitizeSessionData(item.Session),
        TranscodeSession: sanitizeTranscodeSessionData(item.TranscodeSession),
      })),
    },
  };
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
          "X-Plex-Client-Identifier": "Plex-Dashboard",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Plex API Error: ${response.status}`);
    }

    const data = await response.json();

    const sanitizedData = sanitizeMediaData(data);

    return NextResponse.json(sanitizedData);
  } catch (error) {
    console.error("Error fetching from Plex:", error);
    return NextResponse.json(
      { error: "Failed to fetch Plex data" },
      { status: 500 }
    );
  }
}
