export interface Rating {
  image?: string;
  type: string;
  value: string;
  count?: string;
}

export interface Person {
  id?: string;
  tag: string;
  role?: string;
  thumb?: string;
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
  // Transcode info (available from both services)
  videoDecision?: string;
  audioDecision?: string;
  transcodeProgress?: number;
  transcodeHwRequested?: boolean;
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
  directors?: Person[];
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
  directors?: Person[];
  writers?: Person[];
  actors?: Person[];
  // Series-level poster art (Plex: grandparentThumb path; Jellyfin: SeriesId)
  seriesThumbId?: string;
}

export interface MediaData {
  tracks: Track[];
  movies: Movie[];
  episodes: Episode[];
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

export interface HistoryData {
  items: HistoryItem[];
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
