import { NextResponse } from "next/server";
import { applyUsernameMap } from "../../../../../utils/usernameMap";

interface JellyfinPerson {
  Id: string;
  Name: string;
  Role?: string;
  Type: string;
  PrimaryImageTag?: string;
}

interface JellyfinItemDetail {
  People?: JellyfinPerson[];
  Genres?: string[];
  Studios?: { Name: string }[];
  Overview?: string;
  ProductionYear?: number;
  OfficialRating?: string;
  CommunityRating?: number;
  Taglines?: string[];
}

interface JellyfinMediaStream {
  Type: "Video" | "Audio" | "Subtitle" | "EmbeddedImage";
  Codec?: string;
  Profile?: string;
  Width?: number;
  Height?: number;
  BitRate?: number;
  Channels?: number;
  ChannelLayout?: string;
  IsDefault?: boolean;
}

interface JellyfinSession {
  Id: string;
  UserId: string;
  UserName: string;
  DeviceName: string;
  Client: string;
  IsActive: boolean;
  PlayState?: {
    IsPaused?: boolean;
    PositionTicks?: number;
  };
  NowPlayingItem?: {
    Id: string;
    Name: string;
    Type: string;
    SeriesName?: string;
    IndexNumber?: number;
    ParentIndexNumber?: number;
    RunTimeTicks?: number;
    ImageTags?: { Primary?: string };
    ProductionYear?: number;
    AlbumArtist?: string;
    Album?: string;
    Artists?: string[];
    MediaStreams?: JellyfinMediaStream[];
  };
  TranscodingInfo?: {
    IsVideoDirect?: boolean;
    IsAudioDirect?: boolean;
    VideoCodec?: string;
    AudioCodec?: string;
    CompletionPercentage?: number;
    Bitrate?: number;
  };
}

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
      (s): s is JellyfinSession & { NowPlayingItem: NonNullable<JellyfinSession["NowPlayingItem"]> } =>
        s.IsActive && s.NowPlayingItem != null,
    );

    const enriched = await Promise.all(
      activeSessions.map(async (session) => {
        const detail = await fetchItemDetail(
          JELLYFIN_URL,
          JELLYFIN_API_KEY,
          session.UserId,
          session.NowPlayingItem.Id,
        );
        const { RemoteEndPoint: _remoteEndPoint, ...safeSession } = session as typeof session & { RemoteEndPoint?: unknown };
        const nowPlayingItem = safeSession.NowPlayingItem as Record<string, unknown> | undefined;
        if (nowPlayingItem) {
          delete nowPlayingItem.Path;
          delete nowPlayingItem.MediaSources;
        }

        return {
          session: { ...safeSession, UserName: applyUsernameMap(session.UserName) },
          detail,
        };
      }),
    );

    return NextResponse.json({ sessions: enriched });
  } catch (error) {
    console.error("Error fetching from Jellyfin:", error);
    return NextResponse.json(
      { error: "Failed to fetch Jellyfin sessions" },
      { status: 500 },
    );
  }
}
