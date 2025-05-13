import { useState, useEffect, useCallback, useRef } from "react";
import { MediaData } from "../../types/media";
import { fetchMediaData } from "../../utils/api";

interface UseMediaDataOptions {
  activePollingInterval?: number;
  pausedPollingInterval?: number;
  idlePollingInterval?: number;
}

const DEFAULT_OPTIONS: UseMediaDataOptions = {
  activePollingInterval: 30000, // 30 seconds
  pausedPollingInterval: 120000, // 2 minutes
  idlePollingInterval: 300000, // 5 minutes
};

export function useMediaData(options?: UseMediaDataOptions) {
  const config = options ? { ...DEFAULT_OPTIONS, ...options } : DEFAULT_OPTIONS;

  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState<boolean>(true);

  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCount = useRef(0);

  const getPollingInterval = useCallback(
    (data: MediaData | null): number => {
      if (!data) return config.idlePollingInterval!;

      const hasActivePlayback =
        data.tracks.some((t) => t.state === "playing") ||
        data.movies.some((m) => m.state === "playing") ||
        data.episodes.some((e) => e.state === "playing");

      const hasAnySession =
        data.tracks.length > 0 ||
        data.movies.length > 0 ||
        data.episodes.length > 0;

      if (hasActivePlayback) return config.activePollingInterval!;
      if (hasAnySession) return config.pausedPollingInterval!;
      return config.idlePollingInterval!;
    },
    [config]
  );

  const updateProgress = useCallback(() => {
    setMediaData((current) => {
      if (!current) return current;

      return {
        ...current,
        tracks: current.tracks.map((track) => ({
          ...track,
          viewOffset:
            track.state === "playing" && track.duration
              ? Math.min((track.viewOffset || 0) + 1000, track.duration)
              : track.viewOffset,
        })),
        movies: current.movies.map((movie) => ({
          ...movie,
          viewOffset:
            movie.state === "playing"
              ? Math.min((movie.viewOffset || 0) + 1000, movie.duration)
              : movie.viewOffset,
        })),
        episodes: current.episodes.map((episode) => ({
          ...episode,
          viewOffset:
            episode.state === "playing"
              ? Math.min((episode.viewOffset || 0) + 1000, episode.duration)
              : episode.viewOffset,
        })),
      };
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const data = await fetchMediaData();

      setMediaData(data);
      setLastSyncTime(new Date());
      setLoading(false);
      setError(null);
      setIsConnected(true);
      retryCount.current = 0;

      const nextInterval = getPollingInterval(data);

      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }

      pollingTimerRef.current = setTimeout(() => {
        fetchData();
      }, nextInterval);
    } catch (err) {
      console.error("Error fetching media data:", err);
      setError(
        err instanceof Error ? err : new Error("An unknown error occurred")
      );
      setLoading(false);
      setIsConnected(false);

      retryCount.current++;
      const retryDelay = Math.min(
        5000 * Math.pow(2, retryCount.current - 1),
        60000
      );

      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }

      pollingTimerRef.current = setTimeout(() => {
        fetchData();
      }, retryDelay);
    }
  }, [getPollingInterval]);

  useEffect(() => {
    fetchData();

    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const startProgressUpdates = () => {
      if (progressTimerRef.current) return;
      progressTimerRef.current = setInterval(updateProgress, 1000);
    };

    const stopProgressUpdates = () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };

    const hasActivePlayback =
      mediaData &&
      (mediaData.tracks.some((t) => t.state === "playing") ||
        mediaData.movies.some((m) => m.state === "playing") ||
        mediaData.episodes.some((e) => e.state === "playing"));

    if (hasActivePlayback && !document.hidden) {
      startProgressUpdates();
    } else {
      stopProgressUpdates();
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopProgressUpdates();
      } else if (hasActivePlayback) {
        startProgressUpdates();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopProgressUpdates();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mediaData, updateProgress]);

  const refreshData = useCallback(() => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
    }

    retryCount.current = 0;

    fetchData();
  }, [fetchData]);

  return {
    mediaData,
    loading,
    error,
    lastSyncTime,
    isConnected,
    refreshData,
  };
}
