import { useState, useEffect, useCallback, useRef } from "react";
import { MediaData } from "../../types/media";
import { fetchMediaData } from "../../utils/api";

interface UseMediaDataOptions {
  activePollingInterval?: number; // When media is playing (default: 30s)
  pausedPollingInterval?: number; // When all paused (default: 120s)
  idlePollingInterval?: number; // When no sessions (default: 300s)
}

const DEFAULT_OPTIONS: UseMediaDataOptions = {
  activePollingInterval: 30000,
  pausedPollingInterval: 120000,
  idlePollingInterval: 300000,
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
  const lastMediaDataRef = useRef<MediaData | null>(null);

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

      if (lastMediaDataRef.current) {
        data.tracks = data.tracks.map((track) => {
          const oldTrack = lastMediaDataRef.current?.tracks.find(
            (t) => t.id === track.id
          );
          if (
            oldTrack &&
            Math.abs((track.viewOffset || 0) - (oldTrack.viewOffset || 0)) <
              5000
          ) {
            return { ...track, viewOffset: oldTrack.viewOffset };
          }
          return track;
        });

        data.movies = data.movies.map((movie) => {
          const oldMovie = lastMediaDataRef.current?.movies.find(
            (m) => m.id === movie.id
          );
          if (
            oldMovie &&
            Math.abs((movie.viewOffset || 0) - (oldMovie.viewOffset || 0)) <
              5000
          ) {
            return { ...movie, viewOffset: oldMovie.viewOffset };
          }
          return movie;
        });

        data.episodes = data.episodes.map((episode) => {
          const oldEpisode = lastMediaDataRef.current?.episodes.find(
            (e) => e.id === episode.id
          );
          if (
            oldEpisode &&
            Math.abs((episode.viewOffset || 0) - (oldEpisode.viewOffset || 0)) <
              5000
          ) {
            return { ...episode, viewOffset: oldEpisode.viewOffset };
          }
          return episode;
        });
      }

      setMediaData(data);
      lastMediaDataRef.current = data;
      setLastSyncTime(new Date());
      setLoading(false);
      setError(null);
      setIsConnected(true);
      retryCount.current = 0;

      const nextInterval = getPollingInterval(data);
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
      pollingTimerRef.current = setTimeout(fetchData, nextInterval);
    } catch (err) {
      console.error("Error fetching media data:", err);
      setError(
        err instanceof Error ? err : new Error("An unknown error occurred")
      );
      setLoading(false);
      setIsConnected(false);

      retryCount.current++;
      const retryDelay = Math.min(
        (config.activePollingInterval ?? 30000) *
          Math.pow(2, retryCount.current - 1),
        config.idlePollingInterval ?? 300000
      );

      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
      pollingTimerRef.current = setTimeout(fetchData, retryDelay);
    }
  }, [getPollingInterval, config]);

  // Initial fetch and cleanup
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
  }, []); // Empty dependency array - run only once

  // Handle progress updates and visibility changes
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

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopProgressUpdates();
      } else {
        startProgressUpdates();
        // Don't fetch data on visibility change - let polling handle it
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

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopProgressUpdates();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mediaData, updateProgress]); // Remove fetchData from dependencies

  const refreshData = useCallback(() => {
    retryCount.current = 0;
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
    }
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
