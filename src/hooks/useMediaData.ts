import { useState, useEffect } from "react";

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

export function useMediaData() {
  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMediaData = async () => {
      try {
        const response = await fetch("http://localhost:3000/media/current");

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        setMediaData(data);
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("An unknown error occurred")
        );
        setLoading(false);
      }
    };

    fetchMediaData();
  }, []);

  return { mediaData, loading, error };
}
