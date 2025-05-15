import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  const lastUserActivityRef = useRef<number>(Date.now());
  const prevMediaDataRef = useRef<MediaData | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const updateActivity = () => {
      lastUserActivityRef.current = Date.now();
    };

    window.addEventListener("mousemove", updateActivity, { passive: true });
    window.addEventListener("keydown", updateActivity, { passive: true });
    window.addEventListener("touchstart", updateActivity, { passive: true });
    window.addEventListener("scroll", updateActivity, { passive: true });

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
      window.removeEventListener("scroll", updateActivity);
    };
  }, []);

  const getPollingInterval = useCallback(
    (data: MediaData | null): number => {
      const userInactiveTime = Date.now() - lastUserActivityRef.current;
      if (userInactiveTime > 10 * 60 * 1000) {
        return Math.min(config.idlePollingInterval! * 2, 600000); // Max 10 minutes
      }

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

  const processMediaData = useCallback((newData: MediaData): MediaData => {
    if (!prevMediaDataRef.current) {
      prevMediaDataRef.current = newData;
      return newData;
    }

    const prevData = prevMediaDataRef.current;
    const tracksChanged =
      prevData.tracks.length !== newData.tracks.length ||
      JSON.stringify(
        newData.tracks.map((t) => t.id + t.state + t.viewOffset)
      ) !==
        JSON.stringify(
          prevData.tracks.map((t) => t.id + t.state + t.viewOffset)
        );

    const moviesChanged =
      prevData.movies.length !== newData.movies.length ||
      JSON.stringify(
        newData.movies.map((m) => m.id + m.state + m.viewOffset)
      ) !==
        JSON.stringify(
          prevData.movies.map((m) => m.id + m.state + m.viewOffset)
        );

    const episodesChanged =
      prevData.episodes.length !== newData.episodes.length ||
      JSON.stringify(
        newData.episodes.map((e) => e.id + e.state + e.viewOffset)
      ) !==
        JSON.stringify(
          prevData.episodes.map((e) => e.id + e.state + e.viewOffset)
        );

    if (!tracksChanged && !moviesChanged && !episodesChanged) {
      return prevData;
    }

    prevMediaDataRef.current = newData;
    return newData;
  }, []);

  const updateProgress = useCallback(() => {
    setMediaData((current) => {
      if (!current) return current;

      const updated = {
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

      const hasChanges =
        current.tracks.some((t) => t.state === "playing") ||
        current.movies.some((m) => m.state === "playing") ||
        current.episodes.some((e) => e.state === "playing");

      return hasChanges ? updated : current;
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    try {
      setLoading((prevLoading) => {
        return !mediaData && prevLoading !== true ? true : prevLoading;
      });

      const data = await fetchMediaData(abortControllerRef.current.signal);

      const processedData = processMediaData(data);

      setMediaData(processedData);
      setLastSyncTime(new Date());
      setLoading(false);
      setError(null);
      setIsConnected(true);
      retryCount.current = 0;

      const nextInterval = getPollingInterval(processedData);

      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }

      pollingTimerRef.current = setTimeout(() => {
        fetchData();
      }, nextInterval);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.error("Error fetching media data:", err);
        setError(
          err instanceof Error ? err : new Error("An unknown error occurred")
        );
        setLoading(false);
        setIsConnected(false);
        retryCount.current++;
        const retryDelay = Math.min(
          5000 * Math.pow(1.5, retryCount.current - 1),
          60000
        );

        if (pollingTimerRef.current) {
          clearTimeout(pollingTimerRef.current);
        }

        pollingTimerRef.current = setTimeout(() => {
          fetchData();
        }, retryDelay);
      }
    }
  }, [getPollingInterval, mediaData, processMediaData]);

  useEffect(() => {
    fetchData();

    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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
    lastUserActivityRef.current = Date.now();
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
