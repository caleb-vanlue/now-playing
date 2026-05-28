import { useState, useEffect, useCallback, useRef } from "react";
import { HistoryItem } from "../../types/media";
import { fetchHistory } from "../../utils/api";

interface UseHistoryOptions {
  limit?: number;
  syncTrigger?: Date;
}

export function useHistory(options?: UseHistoryOptions) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);

  const doFetch = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      if (!hasFetchedRef.current) setLoading(true);

      const data = await fetchHistory(signal, options?.limit ?? 100);

      if (signal.aborted) return;

      setHistory(data.items);
      setError(null);
      hasFetchedRef.current = true;
    } catch (err) {
      if (signal.aborted) return;
      console.error("Error fetching history:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [options?.limit]);

  useEffect(() => {
    doFetch();
    return () => abortControllerRef.current?.abort();
  }, [doFetch]);

  // Re-fetch when syncTrigger changes (driven by sessions polling)
  useEffect(() => {
    if (!hasFetchedRef.current) return;
    doFetch();
  }, [options?.syncTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    history,
    loading,
    error,
    refreshHistory: doFetch,
  };
}
