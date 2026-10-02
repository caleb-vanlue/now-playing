export interface Rating {
  image?: string;
  type: string;
  value: string;
}

export interface Person {
  tag: string;
  role?: string;
  thumb?: string;
}

// One device's playback within a merged card
export interface Stream {
  sessionId: string;
  userId: string;
  userAvatar?: string;
  player: string;
  state: "playing" | "paused";
  viewOffset?: number;
  syncedAt: number;
  videoDecision?: string;
  audioDecision?: string;
  transcodeHwRequested?: boolean;
}

export interface BaseMedia {
  id: string;
  source: "plex" | "jellyfin";
  title: string;
  userId: string;
  userAvatar?: string;
  state: "playing" | "paused";
  thumbnailFileId?: string;
  player: string;
  startTime: string;
  sessionId: string;
  viewOffset?: number;
  duration?: number;
  // Client timestamp (ms) when viewOffset was reported; progress is
  // interpolated forward from here while playing
  syncedAt: number;
  // Transcode info (available from both services)
  videoDecision?: string;
  audioDecision?: string;
  transcodeProgress?: number;
  transcodeHwRequested?: boolean;
  // Set client-side when 2+ sessions of the same item play in sync; the item's
  // own fields describe the primary (earliest-started) stream
  streams?: Stream[];
}

export interface Track extends BaseMedia {
  artist: string;
  album: string;
  audioCodec: string;
  quality?: string;
  year?: number;
  duration?: number;
}

export interface Movie extends BaseMedia {
  year: number;
  director?: string;
  studio?: string;
  duration: number;
  summary: string;
  videoResolution?: string;
  audioCodec?: string;
  contentRating?: string;
  genre?: string[];
  rating?: number;
  tagline?: string;
  // Media details
  videoCodec?: string;
  videoProfile?: string;
  audioChannels?: number;
  audioChannelLayout?: string;
  // Stream details
  bitrate?: number;
  // People and metadata
  ratings?: Rating[];
  writers?: Person[];
  actors?: Person[];
  backdropPath?: string;
}

export interface Episode extends BaseMedia {
  showTitle: string;
  season: number;
  episode: number;
  duration: number;
  summary: string;
  videoResolution?: string;
  audioCodec?: string;
  contentRating?: string;
  genre?: string[];
  rating?: number;
  // Media details
  videoCodec?: string;
  videoProfile?: string;
  audioChannels?: number;
  audioChannelLayout?: string;
  // Stream details
  bitrate?: number;
  // People and metadata
  ratings?: Rating[];
  writers?: Person[];
  actors?: Person[];
  // Series-level poster art (Plex: grandparentThumb path; Jellyfin: SeriesId)
  seriesThumbId?: string;
  // Series ratingKey for Plex TV shows (used for related content lookup)
  seriesRatingKey?: string;
}

export interface MediaData {
  tracks: Track[];
  movies: Movie[];
  episodes: Episode[];
}

// Client-clock fields are stamped by the browser when a response arrives, so
// progress interpolation never depends on server/client clock agreement
export type SessionItem<T extends BaseMedia> = Omit<T, "syncedAt" | "startTime">;

// What /api/{plex,jellyfin}/sessions return: only the fields the UI renders
export interface SessionsResponse {
  tracks: SessionItem<Track>[];
  movies: SessionItem<Movie>[];
  episodes: SessionItem<Episode>[];
}

export interface HistoryItem {
  id: string;
  source: "plex" | "jellyfin";
  type: "movie" | "episode" | "track";
  displayTitle: string;
  displaySubtitle: string;
  thumb?: string;
  viewedAt: number; // unix seconds
  userName: string;
}

// A history row after simultaneous plays of the same item are merged client-side
export interface HistoryEntry extends Omit<HistoryItem, "userName"> {
  userNames: string[];
  // Raw plays merged into this row; exceeds userNames.length when one account
  // played on several devices
  playCount: number;
}

export interface HistoryData {
  items: HistoryEntry[];
  hasMore: boolean;
}

export interface RelatedItem {
  id: string;
  title: string;
  year?: number;
  thumb?: string;
  type: "movie" | "show" | "episode";
  source: "plex" | "jellyfin";
}
