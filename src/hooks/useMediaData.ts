import { useState, useEffect, useCallback } from "react";

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

const DEFAULT_POLLING_INTERVAL = 5000;

export function useMediaData(pollingInterval = DEFAULT_POLLING_INTERVAL) {
  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:3000/media/current");

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setMediaData(data);
      setLastUpdated(new Date());
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error("Error fetching media data:", err);
      setError(
        err instanceof Error ? err : new Error("An unknown error occurred")
      );
      if (loading) {
        setLoading(false);
      }
    }
  }, [loading]);

  useEffect(() => {
    fetchData();

    const intervalId = setInterval(fetchData, pollingInterval);
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchData, pollingInterval]);

  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    mediaData,
    loading,
    error,
    lastUpdated,
    refreshData,
  };
}
