import { SessionsResponse, SessionItem, Track, Movie, Episode, Rating, Person } from "../types/media";
import { normalizeVideoResolution } from "./mediaCardUtils";

const FETCH_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_FETCH_TIMEOUT || "8000");

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { signal?: AbortSignal } = {},
  timeout = FETCH_TIMEOUT
): Promise<Response> {
  const { signal, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
    timeout
  );
  // Forward the caller's abort reason so cancellation stays distinguishable
  // from a timeout (AbortError vs TimeoutError)
  const onAbort = () => controller.abort(signal?.reason);

  if (signal?.aborted) onAbort();
  else signal?.addEventListener("abort", onAbort, { once: true });

  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onAbort);
  }
}

export function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

// ── Plex API shape types ──────────────────────────────────────────────────────

interface PlexTag {
  tag: string;
  role?: string;
  thumb?: string;
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

export interface PlexSession {
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
  art?: string;
}

interface PlexEpisodeSession extends PlexSession {
  grandparentTitle?: string;
  grandparentThumb?: string;
  grandparentRatingKey?: string;
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

// Copy only rendered fields — Plex tag objects also carry ids, filters and keys
function mapRatings(ratings: PlexRating[] | undefined): Rating[] | undefined {
  return ratings?.map(({ image, type, value }) => ({ image, type, value }));
}

function mapPeople(tags: PlexTag[] | undefined, limit?: number): Person[] | undefined {
  return tags?.slice(0, limit).map(({ tag, role, thumb }) => ({ tag, role, thumb }));
}

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
    session.Session?.id ||
    `${session.type}-${session.ratingKey}-${session.User?.title || ""}-${session.Player?.title || session.Player?.product || ""}`;
  return {
    source: "plex" as const,
    id: session.ratingKey,
    title: session.title,
    thumbnailFileId: session.thumb,
    state: mapPlexState(session.Player?.state),
    userId: session.User?.title || "Unknown User",
    userAvatar: session.User?.thumb || undefined,
    player: session.Player?.title || session.Player?.product || defaultPlayer,
    sessionId,
    viewOffset: session.viewOffset || 0,
    videoDecision: session.TranscodeSession?.videoDecision || "copy",
    audioDecision: session.TranscodeSession?.audioDecision || "copy",
    transcodeProgress: session.TranscodeSession?.progress,
    transcodeHwRequested: session.TranscodeSession?.transcodeHwRequested,
  };
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapToMovie(session: PlexSession): SessionItem<Movie> {
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
    ratings: mapRatings(session.Rating),
    writers: session.Writer?.map(({ tag }) => ({ tag })),
    actors: mapPeople(session.Role, 15),
    backdropPath: session.art,
  };
}

function mapToEpisode(session: PlexEpisodeSession): SessionItem<Episode> {
  const streams = extractPlexStreams(session);
  return {
    ...mapPlexBaseFields(session, "Video Player"),
    ...streams,
    showTitle: session.grandparentTitle || "Unknown Show",
    seriesThumbId: session.grandparentThumb,
    seriesRatingKey: session.grandparentRatingKey,
    season: session.parentIndex || 0,
    episode: session.index || 0,
    summary: session.summary || "",
    contentRating: session.contentRating || "",
    genre: session.Genre?.map((g) => g.tag) || [],
    rating: session.rating ?? session.audienceRating,
    ratings: mapRatings(session.Rating),
    writers: session.Writer?.map(({ tag }) => ({ tag })),
    actors: mapPeople(session.Role, 15),
  };
}

function mapToTrack(session: PlexTrackSession): SessionItem<Track> {
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

/** Server-side: maps raw /status/sessions metadata to the fields the UI renders. */
export function mapPlexSessions(sessions: PlexSession[]): SessionsResponse {
  const result: SessionsResponse = { tracks: [], movies: [], episodes: [] };

  for (const session of sessions) {
    try {
      if (session.type === "track") {
        result.tracks.push(mapToTrack(session as PlexTrackSession));
      } else if (session.type === "movie") {
        result.movies.push(mapToMovie(session));
      } else if (session.type === "episode") {
        result.episodes.push(mapToEpisode(session as PlexEpisodeSession));
      }
    } catch (err) {
      console.error(`Error mapping Plex ${session.type}:`, err);
    }
  }

  return result;
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
