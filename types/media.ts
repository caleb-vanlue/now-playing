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
}

export interface MediaData {
  tracks: Track[];
  movies: Movie[];
  episodes: Episode[];
}
