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

  return {
    id: session.ratingKey,
    title: session.title,
    thumbnailFileId: session.thumb,
    state: mapPlexState(session.Player?.state),
    userId:
      session.User?.title == "Irrelativity17"
        ? "Caleb"
        : session.User?.title || "Unknown User",
    // Add the avatar URL
    userAvatar: session.User?.thumb || null,
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

function mapToEpisode(session: any): Episode {
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
    userAvatar: session.User?.thumb || null,
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
  thumbnailPath: string | undefined
): string | null {
  if (!thumbnailPath) return null;

  return `/api/plex/thumbnail?path=${encodeURIComponent(thumbnailPath)}`;
}
