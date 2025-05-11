import { MediaData, Track, Movie, Episode } from "../types/media";

const PLEX_URL = process.env.NEXT_PUBLIC_PLEX_URL;
const PLEX_TOKEN = process.env.NEXT_PUBLIC_PLEX_TOKEN;
const FETCH_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_FETCH_TIMEOUT || "8000");

interface PlexUser {
  title: string;
}

interface PlexPlayer {
  state: string;
  title?: string;
  product?: string;
  machineIdentifier?: string;
}

interface PlexSession {
  id?: string;
}

interface PlexMedia {
  duration?: number;
  bitrate?: number;
  audioCodec?: string;
  videoCodec?: string;
  videoResolution?: string;
}

interface PlexSessionResponse {
  Session?: PlexSession;
  User?: PlexUser;
  Player?: PlexPlayer;
  Media?: PlexMedia[];
  type: string;
  ratingKey: string;
  title: string;
  thumb?: string;
  summary?: string;
  year?: number;
  viewOffset?: number;
  duration?: number;

  studio?: string;
  director?: string;
  contentRating?: string;

  artist?: string;
  album?: string;

  grandparentTitle?: string;
  parentTitle?: string;
  parentIndex?: number; // Season number
  index?: number; // Episode number
}

interface PlexSessionsResponse {
  MediaContainer: {
    size: number;
    Metadata: PlexSessionResponse[];
  };
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const { signal } = controller;

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function mapPlexState(plexState: string | undefined): "playing" | "paused" {
  return plexState === "playing" ? "playing" : "paused";
}

function mapToMovie(session: PlexSessionResponse): Movie {
  const sessionId =
    session.Session?.id || `movie-${session.ratingKey}-${Date.now()}`;

  return {
    id: session.ratingKey,
    title: session.title,
    thumbnailFileId: session.thumb,
    state: mapPlexState(session.Player?.state),
    userId:
      session.User?.title == "Irrelativity17"
        ? "Caleb"
        : session.User?.title || "Unknown User",
    player: session.Player?.title || session.Player?.product || "Video Player",
    startTime: new Date(Date.now() - (session.viewOffset || 0)).toISOString(),
    sessionId: sessionId,
    year: session.year || 0,
    director: session.director || "Unknown",
    studio: session.studio || "Unknown Studio",
    duration: session.duration || session.Media?.[0]?.duration || 0,
    summary: session.summary || "",
    videoResolution: session.Media?.[0]?.videoResolution || "",
    audioCodec: session.Media?.[0]?.audioCodec || "",
    contentRating: session.contentRating || "",
  };
}

function mapToEpisode(session: PlexSessionResponse): Episode {
  const sessionId =
    session.Session?.id || `episode-${session.ratingKey}-${Date.now()}`;

  return {
    id: session.ratingKey,
    title: session.title,
    thumbnailFileId: session.thumb,
    state: mapPlexState(session.Player?.state),
    userId:
      session.User?.title == "Irrelativity17"
        ? "Caleb"
        : session.User?.title || "Unknown User",
    player: session.Player?.title || session.Player?.product || "Video Player",
    startTime: new Date(Date.now() - (session.viewOffset || 0)).toISOString(),
    sessionId: sessionId,
    showTitle: session.grandparentTitle || "Unknown Show",
    season: session.parentIndex || 0,
    episode: session.index || 0,
    duration: session.duration || session.Media?.[0]?.duration || 0,
    summary: session.summary || "",
    videoResolution: session.Media?.[0]?.videoResolution || "",
    audioCodec: session.Media?.[0]?.audioCodec || "",
    contentRating: session.contentRating || "",
  };
}

function mapToTrack(session: PlexSessionResponse): Track {
  const sessionId =
    session.Session?.id || `track-${session.ratingKey}-${Date.now()}`;

  return {
    id: session.ratingKey,
    title: session.title,
    thumbnailFileId: session.thumb,
    state: mapPlexState(session.Player?.state),
    userId:
      session.User?.title == "Irrelativity17"
        ? "Caleb"
        : session.User?.title || "Unknown User",
    player: session.Player?.title || session.Player?.product || "Music Player",
    startTime: new Date(Date.now() - (session.viewOffset || 0)).toISOString(),
    sessionId: sessionId,
    artist: session.artist || session.grandparentTitle || "Unknown Artist",
    album: session.album || session.parentTitle || "Unknown Album",
    audioCodec: session.Media?.[0]?.audioCodec || "",
    bitrate: session.Media?.[0]?.bitrate || 0,
    year: session.year || null,
  };
}

export async function fetchPlexData(): Promise<MediaData> {
  if (!PLEX_URL || !PLEX_TOKEN) {
    throw new Error("Plex URL or token not configured");
  }

  try {
    const response = await fetchWithTimeout(
      `${PLEX_URL}/status/sessions?X-Plex-Token=${PLEX_TOKEN}`,
      {
        headers: {
          Accept: "application/json",
          "X-Plex-Client-Identifier": "Next-Plex-Dashboard",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Plex API Error (${response.status}): ${errorText || "Unknown error"}`
      );
    }

    const data: PlexSessionsResponse = await response.json();
    const sessions = data.MediaContainer?.Metadata || [];

    const tracks: Track[] = [];
    const movies: Movie[] = [];
    const episodes: Episode[] = [];

    sessions.forEach((session) => {
      try {
        if (session.type === "track") {
          tracks.push(mapToTrack(session));
        } else if (session.type === "movie") {
          movies.push(mapToMovie(session));
        } else if (session.type === "episode") {
          episodes.push(mapToEpisode(session));
        }
      } catch (err) {
        console.error(`Error mapping ${session.type}:`, err);
      }
    });

    return {
      tracks,
      movies,
      episodes,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(
          "Request timed out. The Plex server may be unresponsive."
        );
      }
      throw error;
    }
    throw new Error(
      "Unknown error occurred while fetching media data from Plex"
    );
  }
}

export function getThumbnailUrl(
  thumbnailPath: string | undefined
): string | null {
  if (!thumbnailPath || !PLEX_URL || !PLEX_TOKEN) return null;

  if (thumbnailPath.startsWith("http")) {
    const separator = thumbnailPath.includes("?") ? "&" : "?";
    return `${thumbnailPath}${separator}X-Plex-Token=${PLEX_TOKEN}`;
  }

  return `${PLEX_URL}${thumbnailPath}?X-Plex-Token=${PLEX_TOKEN}`;
}

export async function fetchMediaData(): Promise<MediaData> {
  return fetchPlexData();
}
