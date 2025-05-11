export interface MediaBase {
  id: string;
  title: string;
  thumbnailFileId?: string;
  state: "playing" | "paused";
  userId: string;
  player: string;
  startTime: string;
  sessionId: string;
}

export interface Track extends MediaBase {
  artist: string;
  album: string;
  audioCodec?: string;
  quality?: string;
  year?: number | null;
}

export interface Movie extends MediaBase {
  year: number;
  director: string;
  studio: string;
  duration: number;
  summary: string;
  videoResolution?: string;
  audioCodec?: string;
  contentRating?: string;
}

export interface Episode extends MediaBase {
  showTitle: string;
  season: number;
  episode: number;
  duration: number;
  summary: string;
  videoResolution?: string;
  audioCodec?: string;
  contentRating?: string;
}

export interface MediaData {
  tracks: Track[];
  movies: Movie[];
  episodes: Episode[];
}
