import { useState, useEffect, useCallback, useRef } from "react";
import { HistoryItem } from "../../types/media";

interface UseHistoryOptions {
  accountId?: string;
  limit?: number;
}

export function useHistory(options?: UseHistoryOptions) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const abortController = abortControllerRef.current;

    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (options?.accountId) params.append("accountId", options.accountId);
      if (options?.limit) params.append("limit", options.limit.toString());

      const response = await fetch(`/api/plex/history?${params}`, {
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) return;

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`);
      }

      const data = await response.json();
      const items = data.MediaContainer?.Metadata || [];

      if (abortController.signal.aborted) return;

      setHistory(items);
      setError(null);
    } catch (err) {
      if (abortController.signal.aborted) return;
      
      console.error("Error fetching history:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [options?.accountId, options?.limit]);

  useEffect(() => {
    fetchHistory();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchHistory]);

  const refreshHistory = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    refreshHistory,
  };
}
