import { useState, useEffect, useCallback, useRef } from "react";
import { MediaData } from "../../types/media";
import { fetchMediaData } from "../../utils/api";

interface UseMediaDataOptions {
  activePollingInterval?: number;
  pausedPollingInterval?: number;
  idlePollingInterval?: number;
}

const DEFAULT_OPTIONS: UseMediaDataOptions = {
  activePollingInterval: 60000, // 1 minute (was 30s)
  pausedPollingInterval: 300000, // 5 minutes (was 2m)
  idlePollingInterval: 600000, // 10 minutes (was 5m)
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
  const lastProgressUpdate = useRef<number>(Date.now());

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
    const now = Date.now();
    const timeSinceLastUpdate = now - lastProgressUpdate.current;

    if (timeSinceLastUpdate < 5000) return; // Skip if less than 5 seconds

    lastProgressUpdate.current = now;

    setMediaData((current) => {
      if (!current) return current;

      return {
        ...current,
        tracks: current.tracks.map((track) => ({
          ...track,
          viewOffset:
            track.state === "playing" && track.duration
              ? Math.min(
                  (track.viewOffset || 0) + timeSinceLastUpdate,
                  track.duration
                )
              : track.viewOffset,
        })),
        movies: current.movies.map((movie) => ({
          ...movie,
          viewOffset:
            movie.state === "playing"
              ? Math.min(
                  (movie.viewOffset || 0) + timeSinceLastUpdate,
                  movie.duration
                )
              : movie.viewOffset,
        })),
        episodes: current.episodes.map((episode) => ({
          ...episode,
          viewOffset:
            episode.state === "playing"
              ? Math.min(
                  (episode.viewOffset || 0) + timeSinceLastUpdate,
                  episode.duration
                )
              : episode.viewOffset,
        })),
      };
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const data = await fetchMediaData();

      if (lastMediaDataRef.current) {
        const hasChanges =
          data.tracks.length !== lastMediaDataRef.current.tracks.length ||
          data.movies.length !== lastMediaDataRef.current.movies.length ||
          data.episodes.length !== lastMediaDataRef.current.episodes.length ||
          data.tracks.some((track, i) => {
            const oldTrack = lastMediaDataRef.current!.tracks[i];
            return (
              !oldTrack ||
              track.id !== oldTrack.id ||
              track.state !== oldTrack.state
            );
          }) ||
          data.movies.some((movie, i) => {
            const oldMovie = lastMediaDataRef.current!.movies[i];
            return (
              !oldMovie ||
              movie.id !== oldMovie.id ||
              movie.state !== oldMovie.state
            );
          }) ||
          data.episodes.some((episode, i) => {
            const oldEpisode = lastMediaDataRef.current!.episodes[i];
            return (
              !oldEpisode ||
              episode.id !== oldEpisode.id ||
              episode.state !== oldEpisode.state
            );
          });

        if (!hasChanges) {
          const nextInterval = getPollingInterval(data);
          if (pollingTimerRef.current) {
            clearTimeout(pollingTimerRef.current);
          }
          pollingTimerRef.current = setTimeout(fetchData, nextInterval);
          return;
        }
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
        (config.activePollingInterval ?? 60000) *
          Math.pow(2, retryCount.current - 1),
        config.idlePollingInterval ?? 600000
      );

      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
      pollingTimerRef.current = setTimeout(fetchData, retryDelay);
    }
  }, [getPollingInterval, config]);

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
      progressTimerRef.current = setInterval(updateProgress, 5000); // Update every 5 seconds
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
  }, [mediaData, updateProgress]);

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
