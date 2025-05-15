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
  count?: string;
}

export interface UltraBlurColor {
  bottomLeft: string;
  bottomRight: string;
  topLeft: string;
  topRight: string;
}

export interface BaseMedia {
  id: string;
  title: string;
  userId: string;
  userAvatar?: string;
  state: "playing" | "paused";
  thumbnailFileId?: string;
  player: string;
  startTime: string;
  sessionId: string;
  sessionKey?: string;
  viewOffset?: number;
  // Session info
  bandwidth?: number;
  location?: string;
  secure?: boolean;
  local?: boolean;
  relayed?: boolean;
  // Platform info
  platform?: string;
  platformVersion?: string;
  device?: string;
  product?: string;
  playerVersion?: string;
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
  studio: string;
  duration: number;
  summary: string;
  videoResolution?: string;
  audioCodec?: string;
  contentRating?: string;
  // Additional details
  genre?: string[];
  country?: string[];
  rating?: number;
  audienceRating?: number;
  ratingImage?: string;
  audienceRatingImage?: string;
  tagline?: string;
  originallyAvailableAt?: string;
  // Media details
  container?: string;
  videoCodec?: string;
  videoProfile?: string;
  audioProfile?: string;
  audioChannels?: number;
  // Stream details
  bitrate?: number;
  height?: number;
  width?: number;
  frameRate?: string;
  chromaSubsampling?: string;
  colorPrimaries?: string;
  // Transcode info
  transcodeDecision?: string;
  videoDecision?: string;
  audioDecision?: string;
  transcodeProgress?: number;
  transcodeHwRequested?: boolean;
  // People and metadata
  ratings?: Rating[];
  directors?: Person[];
  writers?: Person[];
  actors?: Person[];
  producers?: Person[];
  ultraBlurColors?: UltraBlurColor[];
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
  // Additional details
  genre?: string[];
  rating?: number;
  audienceRating?: number;
  // Media details
  container?: string;
  videoCodec?: string;
  videoProfile?: string;
  audioProfile?: string;
  audioChannels?: number;
  // Stream details
  bitrate?: number;
  height?: number;
  width?: number;
  frameRate?: string;
  // Transcode info
  transcodeDecision?: string;
  videoDecision?: string;
  audioDecision?: string;
  transcodeProgress?: number;
  transcodeHwRequested?: boolean;
  // People and metadata
  ratings?: Rating[];
  directors?: Person[];
  writers?: Person[];
  actors?: Person[];
  producers?: Person[];
  ultraBlurColors?: UltraBlurColor[];
}

export interface MediaData {
  tracks: Track[];
  movies: Movie[];
  episodes: Episode[];
}

export interface HistoryItem {
  historyKey: string;
  key: string;
  ratingKey: string;
  librarySectionID: string;
  parentKey?: string;
  grandparentKey?: string;
  title: string;
  parentTitle?: string;
  grandparentTitle?: string;
  type: "movie" | "episode" | "track";
  thumb?: string;
  parentThumb?: string;
  grandparentThumb?: string;
  grandparentArt?: string;
  index?: number;
  parentIndex?: number;
  originallyAvailableAt?: string;
  viewedAt: number;
  accountID: number;
  deviceID: number;
  // Additional fields for display
  displayTitle?: string;
  displaySubtitle?: string;
  userName?: string; // Add username field
}
export interface HistoryData {
  items: HistoryItem[];
  size: number;
}
