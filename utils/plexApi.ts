import { MediaData, Track, Movie, Episode } from "../types/media";
import { normalizeVideoResolution } from "./mediaCardUtils";

const FETCH_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_FETCH_TIMEOUT || "8000");

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { signal?: AbortSignal } = {},
  timeout = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ── Plex API shape types ──────────────────────────────────────────────────────

interface PlexTag {
  tag: string;
}

interface PlexRating {
  image?: string;
  type: string;
  value: string;
  count?: string;
}

interface PlexStream {
  streamType: number;
  bitDepth?: number;
  samplingRate?: number;
  bitrate?: number;
  channels?: number;
  audioChannelLayout?: string;
}

interface PlexPart {
  Stream?: PlexStream[];
}

interface PlexMedia {
  duration?: number;
  videoResolution?: string;
  audioCodec?: string;
  videoCodec?: string;
  videoProfile?: string;
  audioChannels?: number;
  bitrate?: number;
  Part?: PlexPart[];
}

interface PlexTranscodeSession {
  videoDecision?: string;
  audioDecision?: string;
  progress?: number;
  transcodeHwRequested?: boolean;
}

interface PlexSession {
  ratingKey: string;
  title: string;
  thumb?: string;
  type: string;
  year?: number;
  duration?: number;
  summary?: string;
  contentRating?: string;
  studio?: string;
  tagline?: string;
  rating?: number;
  audienceRating?: number;
  viewOffset?: number;
  Session?: { id?: string };
  User?: { title?: string; thumb?: string };
  Player?: { state?: string; title?: string; product?: string };
  TranscodeSession?: PlexTranscodeSession;
  Media?: PlexMedia[];
  Genre?: PlexTag[];
  Director?: PlexTag[];
  Writer?: PlexTag[];
  Role?: PlexTag[];
  Rating?: PlexRating[];
}

interface PlexEpisodeSession extends PlexSession {
  grandparentTitle?: string;
  grandparentThumb?: string;
  parentIndex?: number;
  index?: number;
}

interface PlexTrackSession extends PlexSession {
  originalTitle?: string;
  artist?: string;
  grandparentTitle?: string;
  album?: string;
  parentTitle?: string;
}

// ── Shared mapping helpers ────────────────────────────────────────────────────

function mapPlexState(plexState: string | undefined): "playing" | "paused" {
  return plexState === "playing" ? "playing" : "paused";
}

function extractPlexStreams(session: PlexSession) {
  const mediaInfo = session.Media?.[0];
  const audioStream = mediaInfo?.Part?.[0]?.Stream?.find(
    (s) => s.streamType === 2
  );
  return {
    duration: session.duration || mediaInfo?.duration || 0,
    videoResolution: normalizeVideoResolution(mediaInfo?.videoResolution),
    audioCodec: mediaInfo?.audioCodec || "",
    videoCodec: mediaInfo?.videoCodec,
    videoProfile: mediaInfo?.videoProfile,
    audioChannels: mediaInfo?.audioChannels || audioStream?.channels,
    audioChannelLayout: audioStream?.audioChannelLayout,
    bitrate: mediaInfo?.bitrate,
  };
}

function mapPlexBaseFields(session: PlexSession, defaultPlayer: string) {
  const sessionId =
    session.Session?.id || `${session.type}-${session.ratingKey}-${Date.now()}`;
  return {
    source: "plex" as const,
    id: session.ratingKey,
    title: session.title,
    thumbnailFileId: session.thumb,
    state: mapPlexState(session.Player?.state),
    userId: session.User?.title || "Unknown User",
    userAvatar: session.User?.thumb || undefined,
    player: session.Player?.title || session.Player?.product || defaultPlayer,
    startTime: new Date(Date.now() - (session.viewOffset || 0)).toISOString(),
    sessionId,
    viewOffset: session.viewOffset || 0,
    videoDecision: session.TranscodeSession?.videoDecision || "copy",
    audioDecision: session.TranscodeSession?.audioDecision || "copy",
    transcodeProgress: session.TranscodeSession?.progress,
    transcodeHwRequested: session.TranscodeSession?.transcodeHwRequested,
  };
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapToMovie(session: PlexSession): Movie {
  const streams = extractPlexStreams(session);
  return {
    ...mapPlexBaseFields(session, "Video Player"),
    ...streams,
    year: session.year || 0,
    director: session.Director?.[0]?.tag,
    studio: session.studio,
    summary: session.summary || "",
    contentRating: session.contentRating || "",
    genre: session.Genre?.map((g) => g.tag) || [],
    rating: session.rating ?? session.audienceRating,
    tagline: session.tagline,
    ratings: session.Rating,
    directors: session.Director,
    writers: session.Writer,
    actors: session.Role?.slice(0, 10),
  };
}

function mapToEpisode(session: PlexEpisodeSession): Episode {
  const streams = extractPlexStreams(session);
  return {
    ...mapPlexBaseFields(session, "Video Player"),
    ...streams,
    showTitle: session.grandparentTitle || "Unknown Show",
    seriesThumbId: session.grandparentThumb,
    season: session.parentIndex || 0,
    episode: session.index || 0,
    summary: session.summary || "",
    contentRating: session.contentRating || "",
    genre: session.Genre?.map((g) => g.tag) || [],
    rating: session.rating ?? session.audienceRating,
    ratings: session.Rating,
    directors: session.Director,
    writers: session.Writer,
    actors: session.Role?.slice(0, 10),
  };
}

function mapToTrack(session: PlexTrackSession): Track {
  const mediaInfo = session.Media?.[0];
  const stream = mediaInfo?.Part?.[0]?.Stream?.[0];
  const quality =
    stream?.bitDepth && stream?.samplingRate
      ? `${stream.samplingRate / 1000} kHz / ${stream.bitDepth} bit`
      : stream?.bitrate
        ? `${stream.bitrate} kbps`
        : "";

  return {
    ...mapPlexBaseFields(session, "Music Player"),
    artist:
      session.originalTitle ||
      session.artist ||
      session.grandparentTitle ||
      "Unknown Artist",
    album: session.album || session.parentTitle || "Unknown Album",
    audioCodec: mediaInfo?.audioCodec || "",
    quality,
    year: session.year,
    duration: session.duration || mediaInfo?.duration || 0,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchPlexData(signal?: AbortSignal): Promise<MediaData> {
  try {
    const response = await fetchWithTimeout(
      `/api/plex/sessions`,
      { headers: { Accept: "application/json" }, signal },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Plex API Error (${response.status}): ${errorText || "Unknown error"}`
      );
    }

    const data = await response.json();
    const sessions: PlexSession[] = data.MediaContainer?.Metadata || [];

    const tracks: Track[] = [];
    const movies: Movie[] = [];
    const episodes: Episode[] = [];

    for (const session of sessions) {
      try {
        if (session.type === "track") {
          tracks.push(mapToTrack(session as PlexTrackSession));
        } else if (session.type === "movie") {
          movies.push(mapToMovie(session));
        } else if (session.type === "episode") {
          episodes.push(mapToEpisode(session as PlexEpisodeSession));
        }
      } catch (err) {
        console.error(`Error mapping Plex ${session.type}:`, err);
      }
    }

    return { tracks, movies, episodes };
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
  thumbnailPath: string | undefined,
  options?: {
    quality?: "low" | "medium" | "high" | "original";
    width?: number;
  }
): string | null {
  if (!thumbnailPath) return null;

  const params = new URLSearchParams({
    path: thumbnailPath,
    quality: options?.quality || "low",
  });

  if (options?.width) {
    params.append("width", options.width.toString());
  }

  return `/api/plex/thumbnail?${params.toString()}`;
}

export function getResponsiveThumbnailUrl(
  thumbnailPath: string | undefined,
  type: "music" | "movie" | "tv"
): string | null {
  if (!thumbnailPath) return null;

  const sizes: Record<
    string,
    { quality: "low" | "medium" | "high" | "original"; width: number }
  > = {
    music: { quality: "high", width: 500 },
    movie: { quality: "high", width: 600 },
    tv: { quality: "medium", width: 800 },
  };

  return getThumbnailUrl(thumbnailPath, sizes[type]);
}
