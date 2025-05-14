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
  const streamInfo = mediaInfo?.Part?.[0]?.Stream?.[0];

  return {
    id: session.ratingKey,
    title: session.title,
    thumbnailFileId: session.thumb,
    state: mapPlexState(session.Player?.state),
    userId:
      session.User?.title == "Irrelativity17"
        ? "Caleb"
        : session.User?.title || "Unknown User",
    userAvatar: session.User?.thumb || null,
    player: session.Player?.title || session.Player?.product || "Video Player",
    startTime: new Date(Date.now() - (session.viewOffset || 0)).toISOString(),
    sessionId: sessionId,
    sessionKey: session.sessionKey,
    year: session.year || 0,
    director: session.Director?.[0]?.tag || session.director || "Unknown",
    studio: session.studio || "Unknown Studio",
    duration: session.duration || mediaInfo?.duration || 0,
    summary: session.summary || "",
    videoResolution: mediaInfo?.videoResolution || "",
    audioCodec: mediaInfo?.audioCodec || "",
    contentRating: session.contentRating || "",
    viewOffset: session.viewOffset || 0,
    // Additional details
    genre: session.Genre?.map((g: any) => g.tag) || [],
    country: session.Country?.map((c: any) => c.tag) || [],
    rating: session.rating,
    audienceRating: session.audienceRating,
    ratingImage: session.ratingImage,
    audienceRatingImage: session.audienceRatingImage,
    tagline: session.tagline,
    originallyAvailableAt: session.originallyAvailableAt,
    // Media details
    container: mediaInfo?.container,
    videoCodec: mediaInfo?.videoCodec,
    videoProfile: mediaInfo?.videoProfile,
    audioProfile: mediaInfo?.audioProfile,
    audioChannels: mediaInfo?.audioChannels,
    // Stream details
    bitrate: mediaInfo?.bitrate,
    height: mediaInfo?.height,
    width: mediaInfo?.width,
    frameRate: mediaInfo?.videoFrameRate,
    chromaSubsampling: streamInfo?.chromaSubsampling,
    colorPrimaries: streamInfo?.colorPrimaries,
    // Transcode info
    transcodeDecision:
      session.TranscodeSession?.videoDecision === "transcode" ||
      session.TranscodeSession?.audioDecision === "transcode"
        ? "transcode"
        : "direct",
    videoDecision: session.TranscodeSession?.videoDecision || "direct",
    audioDecision: session.TranscodeSession?.audioDecision || "direct",
    transcodeProgress: session.TranscodeSession?.progress,
    transcodeHwRequested: session.TranscodeSession?.transcodeHwRequested,
    // Session info
    bandwidth: session.Session?.bandwidth,
    location: session.Session?.location,
    secure: session.Player?.secure,
    local: session.Player?.local,
    relayed: session.Player?.relayed,
    // Platform info
    platform: session.Player?.platform,
    platformVersion: session.Player?.platformVersion,
    device: session.Player?.device,
    product: session.Player?.product,
    playerVersion: session.Player?.version,
    // People and metadata
    ratings: session.Rating,
    directors: session.Director,
    writers: session.Writer,
    actors: session.Role?.slice(0, 10), // Limit to first 10 actors for performance
    producers: session.Producer,
    ultraBlurColors: session.UltraBlurColors,
  };
}

function mapToEpisode(session: any): Episode {
  const sessionId =
    session.Session?.id || `episode-${session.ratingKey}-${Date.now()}`;
  const mediaInfo = session.Media?.[0];
  const streamInfo = mediaInfo?.Part?.[0]?.Stream?.[0];

  return {
    id: session.ratingKey,
    title: session.title,
    thumbnailFileId: session.thumb,
    state: mapPlexState(session.Player?.state),
    userId:
      session.User?.title == "Irrelativity17"
        ? "Caleb"
        : session.User?.title || "Unknown User",
    userAvatar: session.User?.thumb || null,
    player: session.Player?.title || session.Player?.product || "Video Player",
    startTime: new Date(Date.now() - (session.viewOffset || 0)).toISOString(),
    sessionId: sessionId,
    sessionKey: session.sessionKey,
    showTitle: session.grandparentTitle || "Unknown Show",
    season: session.parentIndex || 0,
    episode: session.index || 0,
    duration: session.duration || mediaInfo?.duration || 0,
    summary: session.summary || "",
    videoResolution: mediaInfo?.videoResolution || "",
    audioCodec: mediaInfo?.audioCodec || "",
    contentRating: session.contentRating || "",
    viewOffset: session.viewOffset || 0,
    // Additional details
    genre: session.Genre?.map((g: any) => g.tag) || [],
    rating: session.rating,
    audienceRating: session.audienceRating,
    // Media details
    container: mediaInfo?.container,
    videoCodec: mediaInfo?.videoCodec,
    videoProfile: mediaInfo?.videoProfile,
    audioProfile: mediaInfo?.audioProfile,
    audioChannels: mediaInfo?.audioChannels,
    // Stream details
    bitrate: mediaInfo?.bitrate,
    height: mediaInfo?.height,
    width: mediaInfo?.width,
    frameRate: mediaInfo?.videoFrameRate,
    // Transcode info
    transcodeDecision:
      session.TranscodeSession?.videoDecision === "transcode" ||
      session.TranscodeSession?.audioDecision === "transcode"
        ? "transcode"
        : "direct",
    videoDecision: session.TranscodeSession?.videoDecision || "direct",
    audioDecision: session.TranscodeSession?.audioDecision || "direct",
    transcodeProgress: session.TranscodeSession?.progress,
    transcodeHwRequested: session.TranscodeSession?.transcodeHwRequested,
    // Session info
    bandwidth: session.Session?.bandwidth,
    location: session.Session?.location,
    secure: session.Player?.secure,
    local: session.Player?.local,
    relayed: session.Player?.relayed,
    // Platform info
    platform: session.Player?.platform,
    platformVersion: session.Player?.platformVersion,
    device: session.Player?.device,
    product: session.Player?.product,
    playerVersion: session.Player?.version,
    // People and metadata
    ratings: session.Rating,
    directors: session.Director,
    writers: session.Writer,
    actors: session.Role?.slice(0, 10),
    producers: session.Producer,
    ultraBlurColors: session.UltraBlurColors,
  };
}

function mapToTrack(session: any): Track {
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
    userAvatar: session.User?.thumb || null,
    player: session.Player?.title || session.Player?.product || "Music Player",
    startTime: new Date(Date.now() - (session.viewOffset || 0)).toISOString(),
    sessionId: sessionId,
    sessionKey: session.sessionKey,
    artist: session.artist || session.grandparentTitle || "Unknown Artist",
    album: session.album || session.parentTitle || "Unknown Album",
    audioCodec: session.Media?.[0]?.audioCodec || "",
    quality:
      (session.Media?.[0].Part?.[0]?.Stream?.[0]?.bitDepth &&
      session.Media?.[0].Part?.[0]?.Stream?.[0]?.samplingRate
        ? `${
            session.Media?.[0].Part?.[0]?.Stream?.[0]?.samplingRate / 1000
          } kHz / ${session.Media?.[0].Part?.[0]?.Stream?.[0]?.bitDepth} bit`
        : `${session.Media?.[0].Part?.[0]?.Stream?.[0]?.bitrate} kbps`) || "",
    year: session.year || null,
    viewOffset: session.viewOffset || 0,
    duration: session.duration || session.Media?.[0]?.duration || 0,
  };
}

export async function fetchPlexData(): Promise<MediaData> {
  try {
    const response = await fetchWithTimeout(`/api/plex/sessions`, {
      headers: {
        Accept: "application/json",
      },
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
  thumbnailPath: string | undefined,
  options?: {
    quality?: "low" | "medium" | "high" | "original";
    width?: number;
  }
): string | null {
  if (!thumbnailPath) return null;

  const params = new URLSearchParams({
    path: thumbnailPath,
    quality: options?.quality || "medium",
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
