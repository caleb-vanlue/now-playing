import { MediaData, Track, Movie, Episode } from "../types/media";

const FETCH_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_FETCH_TIMEOUT || "8000");

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

function mapToMovie(session: any): Movie {
  const sessionId =
    session.Session?.id || `movie-${session.ratingKey}-${Date.now()}`;
  const mediaInfo = session.Media?.[0];
  const audioStream = mediaInfo?.Part?.[0]?.Stream?.find(
    (s: any) => s.streamType === 2
  );

  const videoDecision = session.TranscodeSession?.videoDecision || "copy";
  const audioDecision = session.TranscodeSession?.audioDecision || "copy";

  return {
    source: "plex",
    id: session.ratingKey,
    title: session.title,
    thumbnailFileId: session.thumb,
    state: mapPlexState(session.Player?.state),
    userId: session.User?.title || "Unknown User",
    userAvatar: session.User?.thumb || undefined,
    player: session.Player?.title || session.Player?.product || "Video Player",
    startTime: new Date(Date.now() - (session.viewOffset || 0)).toISOString(),
    sessionId,
    year: session.year || 0,
    director: session.Director?.[0]?.tag || undefined,
    studio: session.studio || undefined,
    duration: session.duration || mediaInfo?.duration || 0,
    summary: session.summary || "",
    videoResolution: mediaInfo?.videoResolution || "",
    audioCodec: mediaInfo?.audioCodec || "",
    contentRating: session.contentRating || "",
    viewOffset: session.viewOffset || 0,
    genre: session.Genre?.map((g: any) => g.tag) || [],
    rating: session.rating,
    tagline: session.tagline,
    videoCodec: mediaInfo?.videoCodec,
    videoProfile: mediaInfo?.videoProfile,
    audioChannels: mediaInfo?.audioChannels || audioStream?.channels,
    audioChannelLayout: audioStream?.audioChannelLayout,
    bitrate: mediaInfo?.bitrate,
    videoDecision,
    audioDecision,
    transcodeProgress: session.TranscodeSession?.progress,
    transcodeHwRequested: session.TranscodeSession?.transcodeHwRequested,
    ratings: session.Rating,
    directors: session.Director,
    writers: session.Writer,
    actors: session.Role?.slice(0, 10),
  };
}

function mapToEpisode(session: any): Episode {
  const sessionId =
    session.Session?.id || `episode-${session.ratingKey}-${Date.now()}`;
  const mediaInfo = session.Media?.[0];
  const audioStream = mediaInfo?.Part?.[0]?.Stream?.find(
    (s: any) => s.streamType === 2
  );

  const videoDecision = session.TranscodeSession?.videoDecision || "copy";
  const audioDecision = session.TranscodeSession?.audioDecision || "copy";

  return {
    source: "plex",
    id: session.ratingKey,
    title: session.title,
    thumbnailFileId: session.thumb,
    state: mapPlexState(session.Player?.state),
    userId: session.User?.title || "Unknown User",
    userAvatar: session.User?.thumb || undefined,
    player: session.Player?.title || session.Player?.product || "Video Player",
    startTime: new Date(Date.now() - (session.viewOffset || 0)).toISOString(),
    sessionId,
    showTitle: session.grandparentTitle || "Unknown Show",
    season: session.parentIndex || 0,
    episode: session.index || 0,
    duration: session.duration || mediaInfo?.duration || 0,
    summary: session.summary || "",
    videoResolution: mediaInfo?.videoResolution || "",
    audioCodec: mediaInfo?.audioCodec || "",
    contentRating: session.contentRating || "",
    viewOffset: session.viewOffset || 0,
    genre: session.Genre?.map((g: any) => g.tag) || [],
    rating: session.rating,
    videoCodec: mediaInfo?.videoCodec,
    videoProfile: mediaInfo?.videoProfile,
    audioChannels: mediaInfo?.audioChannels || audioStream?.channels,
    audioChannelLayout: audioStream?.audioChannelLayout,
    bitrate: mediaInfo?.bitrate,
    videoDecision,
    audioDecision,
    transcodeProgress: session.TranscodeSession?.progress,
    transcodeHwRequested: session.TranscodeSession?.transcodeHwRequested,
    ratings: session.Rating,
    directors: session.Director,
    writers: session.Writer,
    actors: session.Role?.slice(0, 10),
  };
}

function mapToTrack(session: any): Track {
  const sessionId =
    session.Session?.id || `track-${session.ratingKey}-${Date.now()}`;

  return {
    source: "plex",
    id: session.ratingKey,
    title: session.title,
    thumbnailFileId: session.thumb,
    state: mapPlexState(session.Player?.state),
    userId: session.User?.title || "Unknown User",
    userAvatar: session.User?.thumb || undefined,
    player: session.Player?.title || session.Player?.product || "Music Player",
    startTime: new Date(Date.now() - (session.viewOffset || 0)).toISOString(),
    sessionId,
    artist:
      session.originalTitle ||
      session.artist ||
      session.grandparentTitle ||
      "Unknown Artist",
    album: session.album || session.parentTitle || "Unknown Album",
    audioCodec: session.Media?.[0]?.audioCodec || "",
    quality:
      (session.Media?.[0].Part?.[0]?.Stream?.[0]?.bitDepth &&
      session.Media?.[0].Part?.[0]?.Stream?.[0]?.samplingRate
        ? `${
            session.Media?.[0].Part?.[0]?.Stream?.[0]?.samplingRate / 1000
          } kHz / ${session.Media?.[0].Part?.[0]?.Stream?.[0]?.bitDepth} bit`
        : `${session.Media?.[0].Part?.[0]?.Stream?.[0]?.bitrate} kbps`) || "",
    year: session.year || undefined,
    viewOffset: session.viewOffset || 0,
    duration: session.duration || session.Media?.[0]?.duration || 0,
  };
}

export async function fetchPlexData(signal?: AbortSignal): Promise<MediaData> {
  try {
    const response = await fetchWithTimeout(`/api/plex/sessions`, {
      headers: {
        Accept: "application/json",
      },
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Plex API Error (${response.status}): ${errorText || "Unknown error"}`
      );
    }

    const data = await response.json();
    const sessions = data.MediaContainer?.Metadata || [];

    const tracks: Track[] = [];
    const movies: Movie[] = [];
    const episodes: Episode[] = [];

    sessions.forEach((session: any) => {
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
