import { SessionsResponse, SessionItem, Track, Movie, Episode, Person } from "../types/media";
import { normalizeVideoResolution } from "./mediaCardUtils";

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

export interface JellyfinItemDetail {
  People?: JellyfinPerson[];
  Genres?: string[];
  Studios?: { Name: string }[];
  Overview?: string;
  OfficialRating?: string;
  CommunityRating?: number;
  Taglines?: string[];
  AlbumArtist?: string;
  ProductionYear?: number;
  BackdropImageTags?: string[];
}

interface JellyfinNowPlayingItem {
  Id: string;
  Name: string;
  Type: string;
  SeriesId?: string;
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

export interface JellyfinSession {
  Id: string;
  UserId: string;
  UserName?: string;
  DeviceName?: string;
  Client?: string;
  IsActive?: boolean;
  NowPlayingItem?: JellyfinNowPlayingItem;
  PlayState?: JellyfinPlayState;
  TranscodingInfo?: JellyfinTranscodingInfo;
}

export interface EnrichedSession {
  session: JellyfinSession & { NowPlayingItem: JellyfinNowPlayingItem };
  detail: JellyfinItemDetail;
}

type ActiveSession = EnrichedSession["session"];

function ticksToMs(ticks: number | undefined): number {
  return ticks ? Math.floor(ticks / 10000) : 0;
}

export function jellyfinThumbnailUrl(
  itemId: string,
  quality: "low" | "medium" | "high" = "medium",
  width?: number,
  imageType: string = "Primary"
): string {
  const params = new URLSearchParams({ itemId, imageType, quality });
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

function extractStreams(streams: JellyfinMediaStream[] | undefined) {
  const videoStream = streams?.find((s) => s.Type === "Video");
  const audioStream =
    streams?.find((s) => s.Type === "Audio" && s.IsDefault !== false) ??
    streams?.find((s) => s.Type === "Audio");

  // Use the larger of the actual height or the 16:9-equivalent height derived
  // from width, so letterboxed content (e.g. cinemascope 3840×1608) isn't
  // misclassified — 3840px wide is 4K even when height is only 1608.
  const effectiveHeight = videoStream
    ? Math.max(videoStream.Height ?? 0, Math.round((videoStream.Width ?? 0) * 9 / 16))
    : undefined;

  return {
    videoResolution: normalizeVideoResolution(effectiveHeight?.toString()),
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

function mapJellyfinBaseFields(session: ActiveSession, defaultPlayer: string) {
  const item = session.NowPlayingItem;
  const viewOffset = ticksToMs(session.PlayState?.PositionTicks);
  return {
    source: "jellyfin" as const,
    id: item.Id,
    title: item.Name,
    thumbnailFileId: item.Id,
    state: mapJellyfinState(session.PlayState?.IsPaused),
    userId: session.UserName ?? "Unknown User",
    userAvatar: jellyfinUserAvatarUrl(session.UserId),
    player: session.DeviceName ?? session.Client ?? defaultPlayer,
    sessionId: session.Id,
    viewOffset,
  };
}

function mapToMovie(session: ActiveSession, detail: JellyfinItemDetail): SessionItem<Movie> {
  const item = session.NowPlayingItem;
  const tc = session.TranscodingInfo;
  const streams = extractStreams(item.MediaStreams);

  const videoDecision = tc ? (tc.IsVideoDirect ? "copy" : "transcode") : "copy";
  const audioDecision = tc ? (tc.IsAudioDirect ? "copy" : "transcode") : "copy";

  return {
    ...mapJellyfinBaseFields(session, "Video Player"),
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
    actors: mapPeople(detail.People, "Actor").slice(0, 15),
    writers: mapPeople(detail.People, "Writer").map(({ tag }) => ({ tag })),
    backdropPath: detail.BackdropImageTags?.length ? item.Id : undefined,
    ...streams,
  };
}

function mapToEpisode(
  session: ActiveSession,
  detail: JellyfinItemDetail
): SessionItem<Episode> {
  const item = session.NowPlayingItem;
  const tc = session.TranscodingInfo;
  const streams = extractStreams(item.MediaStreams);

  const videoDecision = tc ? (tc.IsVideoDirect ? "copy" : "transcode") : "copy";
  const audioDecision = tc ? (tc.IsAudioDirect ? "copy" : "transcode") : "copy";

  return {
    ...mapJellyfinBaseFields(session, "Video Player"),
    showTitle: item.SeriesName ?? "Unknown Show",
    seriesThumbId: item.SeriesId,
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
    actors: mapPeople(detail.People, "Actor").slice(0, 15),
    writers: mapPeople(detail.People, "Writer").map(({ tag }) => ({ tag })),
    ...streams,
  };
}

function mapToTrack(session: ActiveSession, detail: JellyfinItemDetail): SessionItem<Track> {
  const item = session.NowPlayingItem;
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
    ...mapJellyfinBaseFields(session, "Music Player"),
    artist,
    album: item.Album ?? "Unknown Album",
    audioCodec: audioStream?.Codec ?? "",
    quality,
    year: item.ProductionYear ?? detail.ProductionYear,
    duration: ticksToMs(item.RunTimeTicks),
  };
}

/** Server-side: maps enriched sessions to the fields the UI renders. */
export function mapJellyfinSessions(enrichedSessions: EnrichedSession[]): SessionsResponse {
  const result: SessionsResponse = { tracks: [], movies: [], episodes: [] };

  enrichedSessions.forEach(({ session, detail }) => {
    try {
      const type = session.NowPlayingItem.Type;
      if (type === "Audio") {
        result.tracks.push(mapToTrack(session, detail));
      } else if (type === "Movie") {
        result.movies.push(mapToMovie(session, detail));
      } else if (type === "Episode") {
        result.episodes.push(mapToEpisode(session, detail));
      }
    } catch (err) {
      console.error("Error mapping Jellyfin session:", err);
    }
  });

  return result;
}
