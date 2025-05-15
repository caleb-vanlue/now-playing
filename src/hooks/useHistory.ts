import { useState, useEffect, useCallback } from "react";
import { HistoryItem } from "../../types/media";

interface UseHistoryOptions {
  accountId?: string;
  limit?: number;
}

export function useHistory(options?: UseHistoryOptions) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (options?.accountId) params.append("accountId", options.accountId);
      if (options?.limit) params.append("limit", options.limit.toString());

      const response = await fetch(`/api/plex/history?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`);
      }

      const data = await response.json();
      const items = data.MediaContainer?.Metadata || [];

      setHistory(items);
      setError(null);
    } catch (err) {
      console.error("Error fetching history:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [options?.accountId, options?.limit]);

  useEffect(() => {
    fetchHistory();
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
