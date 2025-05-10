export interface User {
  name: string;
}

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
}

export interface Movie extends MediaBase {
  year: number;
  director: string;
  studio: string;
  duration: number;
  summary: string;
}

export interface Episode extends MediaBase {
  showTitle: string;
  season: number;
  episode: number;
  duration: number;
  summary: string;
}

export interface MediaData {
  tracks: Track[];
  movies: Movie[];
  episodes: Episode[];
}
