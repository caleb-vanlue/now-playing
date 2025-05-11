import { useState, useEffect, useCallback } from "react";
import { MediaData } from "../../types/media";
import { fetchMediaData } from "../../utils/api";

const DEFAULT_POLLING_INTERVAL = 10000;

export function useMediaData(pollingInterval = DEFAULT_POLLING_INTERVAL) {
  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const data = await fetchMediaData();
      setMediaData(data);
      setLastUpdated(new Date());
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error("Error fetching media data:", err);
      setError(
        err instanceof Error ? err : new Error("An unknown error occurred")
      );
      setLoading(false);
    }
  }, []);

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
