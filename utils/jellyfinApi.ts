import { MediaData, Track, Movie, Episode, Person } from "../types/media";
import { applyUsernameMap } from "./usernameMap";

const FETCH_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_FETCH_TIMEOUT || "8000");

interface JellyfinPerson {
  Id: string;
  Name: string;
  Role?: string;
  Type: string;
  PrimaryImageTag?: string;
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

interface JellyfinItemDetail {
  People?: JellyfinPerson[];
  Genres?: string[];
  Studios?: { Name: string }[];
  Overview?: string;
  OfficialRating?: string;
  CommunityRating?: number;
  Taglines?: string[];
  AlbumArtist?: string;
  ProductionYear?: number;
}

interface JellyfinNowPlayingItem {
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
}

interface JellyfinPlayState {
  IsPaused?: boolean;
  PositionTicks?: number;
}

interface JellyfinTranscodingInfo {
  IsVideoDirect?: boolean;
  IsAudioDirect?: boolean;
  CompletionPercentage?: number;
}

interface JellyfinSession {
  Id: string;
  UserId?: string;
  UserName?: string;
  DeviceName?: string;
  Client?: string;
  NowPlayingItem: JellyfinNowPlayingItem;
  PlayState?: JellyfinPlayState;
  TranscodingInfo?: JellyfinTranscodingInfo;
}

interface EnrichedSession {
  session: JellyfinSession;
  detail: JellyfinItemDetail;
}

function ticksToMs(ticks: number | undefined): number {
  return ticks ? Math.floor(ticks / 10000) : 0;
}

export function jellyfinThumbnailUrl(
  itemId: string,
  quality: "low" | "medium" | "high" = "medium",
  width?: number
): string {
  const params = new URLSearchParams({ itemId, imageType: "Primary", quality });
  if (width) params.set("width", width.toString());
  return `/api/jellyfin/thumbnail?${params.toString()}`;
}

function mapPeople(
  people: JellyfinPerson[] | undefined,
  type: string
): Person[] {
  if (!people) return [];
  return people
    .filter((p) => p.Type === type)
    .map((p) => ({
      id: p.Id,
      tag: p.Name,
      role: p.Role,
      thumb: p.PrimaryImageTag
        ? `/api/jellyfin/thumbnail?itemId=${p.Id}&imageType=Primary&quality=low&width=80`
        : undefined,
    }));
}

function mapJellyfinState(isPaused: boolean | undefined): "playing" | "paused" {
  return isPaused ? "paused" : "playing";
}

function heightToResolutionLabel(height: number | undefined): string {
  if (!height) return "";
  if (height >= 2160) return "4k";
  if (height >= 1440) return "1440";
  if (height >= 1080) return "1080";
  if (height >= 720) return "720";
  if (height >= 480) return "480";
  return String(height);
}

function extractStreams(streams: JellyfinMediaStream[] | undefined) {
  const videoStream = streams?.find((s) => s.Type === "Video");
  const audioStream =
    streams?.find((s) => s.Type === "Audio" && s.IsDefault !== false) ??
    streams?.find((s) => s.Type === "Audio");

  return {
    videoResolution: heightToResolutionLabel(videoStream?.Height),
    videoCodec: videoStream?.Codec,
    videoProfile: videoStream?.Profile,
    // BitRate from Jellyfin is bits/sec; our type stores kbps (card renders kbps/1000 = Mbps)
    bitrate: videoStream?.BitRate ? Math.round(videoStream.BitRate / 1000) : undefined,
    audioCodec: audioStream?.Codec,
    audioChannels: audioStream?.Channels,
    audioChannelLayout: audioStream?.ChannelLayout,
  };
}

function jellyfinUserAvatarUrl(userId: string | undefined): string | undefined {
  if (!userId) return undefined;
  return `/api/jellyfin/thumbnail?itemId=${userId}&imageType=Primary&type=user&quality=low&width=80`;
}

function mapToMovie(session: JellyfinSession, detail: JellyfinItemDetail): Movie {
  const item = session.NowPlayingItem;
  const play = session.PlayState ?? {};
  const tc = session.TranscodingInfo;
  const streams = extractStreams(item.MediaStreams);

  const videoDecision = tc ? (tc.IsVideoDirect ? "copy" : "transcode") : "copy";
  const audioDecision = tc ? (tc.IsAudioDirect ? "copy" : "transcode") : "copy";

  return {
    source: "jellyfin",
    id: item.Id,
    title: item.Name,
    thumbnailFileId: item.Id,
    state: mapJellyfinState(play.IsPaused),
    userId: applyUsernameMap(session.UserName ?? "Unknown User"),
    userAvatar: jellyfinUserAvatarUrl(session.UserId),
    player: session.DeviceName ?? session.Client ?? "Video Player",
    startTime: new Date(Date.now() - ticksToMs(play.PositionTicks)).toISOString(),
    sessionId: session.Id,
    viewOffset: ticksToMs(play.PositionTicks),
    year: detail.ProductionYear ?? item.ProductionYear ?? 0,
    director: detail.People?.find((p) => p.Type === "Director")?.Name,
    studio: detail.Studios?.[0]?.Name,
    duration: ticksToMs(item.RunTimeTicks),
    summary: detail.Overview ?? "",
    contentRating: detail.OfficialRating,
    genre: detail.Genres ?? [],
    rating: detail.CommunityRating,
    tagline: detail.Taglines?.[0],
    videoDecision,
    audioDecision,
    transcodeProgress: tc?.CompletionPercentage,
    transcodeHwRequested: false,
    actors: mapPeople(detail.People, "Actor").slice(0, 10),
    directors: mapPeople(detail.People, "Director"),
    writers: mapPeople(detail.People, "Writer"),
    ...streams,
  };
}

function mapToEpisode(
  session: JellyfinSession,
  detail: JellyfinItemDetail
): Episode {
  const item = session.NowPlayingItem;
  const play = session.PlayState ?? {};
  const tc = session.TranscodingInfo;
  const streams = extractStreams(item.MediaStreams);

  const videoDecision = tc ? (tc.IsVideoDirect ? "copy" : "transcode") : "copy";
  const audioDecision = tc ? (tc.IsAudioDirect ? "copy" : "transcode") : "copy";

  return {
    source: "jellyfin",
    id: item.Id,
    title: item.Name,
    thumbnailFileId: item.Id,
    state: mapJellyfinState(play.IsPaused),
    userId: applyUsernameMap(session.UserName ?? "Unknown User"),
    userAvatar: jellyfinUserAvatarUrl(session.UserId),
    player: session.DeviceName ?? session.Client ?? "Video Player",
    startTime: new Date(Date.now() - ticksToMs(play.PositionTicks)).toISOString(),
    sessionId: session.Id,
    viewOffset: ticksToMs(play.PositionTicks),
    showTitle: item.SeriesName ?? "Unknown Show",
    season: item.ParentIndexNumber ?? 0,
    episode: item.IndexNumber ?? 0,
    duration: ticksToMs(item.RunTimeTicks),
    summary: detail.Overview ?? "",
    contentRating: detail.OfficialRating,
    genre: detail.Genres ?? [],
    rating: detail.CommunityRating,
    videoDecision,
    audioDecision,
    transcodeProgress: tc?.CompletionPercentage,
    transcodeHwRequested: false,
    actors: mapPeople(detail.People, "Actor").slice(0, 10),
    directors: mapPeople(detail.People, "Director"),
    writers: mapPeople(detail.People, "Writer"),
    ...streams,
  };
}

function mapToTrack(session: JellyfinSession, detail: JellyfinItemDetail): Track {
  const item = session.NowPlayingItem;
  const play = session.PlayState ?? {};
  const audioStream =
    item.MediaStreams?.find((s) => s.Type === "Audio" && s.IsDefault !== false) ??
    item.MediaStreams?.find((s) => s.Type === "Audio");

  const artist =
    item.Artists?.[0] ??
    item.AlbumArtist ??
    detail.AlbumArtist ??
    "Unknown Artist";

  const quality = audioStream
    ? audioStream.BitRate
      ? `${Math.round(audioStream.BitRate / 1000)} kbps`
      : audioStream.Codec?.toUpperCase() ?? ""
    : "";

  return {
    source: "jellyfin",
    id: item.Id,
    title: item.Name,
    thumbnailFileId: item.Id,
    state: mapJellyfinState(play.IsPaused),
    userId: applyUsernameMap(session.UserName ?? "Unknown User"),
    userAvatar: jellyfinUserAvatarUrl(session.UserId),
    player: session.DeviceName ?? session.Client ?? "Music Player",
    startTime: new Date(Date.now() - ticksToMs(play.PositionTicks)).toISOString(),
    sessionId: session.Id,
    viewOffset: ticksToMs(play.PositionTicks),
    artist,
    album: item.Album ?? "Unknown Album",
    audioCodec: audioStream?.Codec ?? "",
    quality,
    year: item.ProductionYear ?? detail.ProductionYear,
    duration: ticksToMs(item.RunTimeTicks),
  };
}

export async function fetchJellyfinData(
  signal?: AbortSignal
): Promise<MediaData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  const fetchSignal = signal ?? controller.signal;

  try {
    const response = await fetch("/api/jellyfin/sessions", {
      headers: { Accept: "application/json" },
      signal: fetchSignal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Jellyfin API Error (${response.status}): ${text || "Unknown error"}`
      );
    }

    const data = await response.json();
    const enrichedSessions: EnrichedSession[] = data.sessions ?? [];

    const tracks: Track[] = [];
    const movies: Movie[] = [];
    const episodes: Episode[] = [];

    enrichedSessions.forEach(({ session, detail }) => {
      try {
        const type = session.NowPlayingItem?.Type;
        if (type === "Audio") {
          tracks.push(mapToTrack(session, detail));
        } else if (type === "Movie") {
          movies.push(mapToMovie(session, detail));
        } else if (type === "Episode") {
          episodes.push(mapToEpisode(session, detail));
        }
      } catch (err) {
        console.error("Error mapping Jellyfin session:", err);
      }
    });

    return { tracks, movies, episodes };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Request timed out. The Jellyfin server may be unresponsive."
      );
    }
    throw error;
  }
}
