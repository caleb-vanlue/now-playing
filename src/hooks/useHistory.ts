import { useState, useEffect, useCallback, useRef } from "react";
import { HistoryItem } from "../../types/media";
import { fetchHistory } from "../../utils/api";

const PAGE_SIZE = 25;

interface UseHistoryOptions {
  syncTrigger?: Date;
}

export function useHistory(options?: UseHistoryOptions) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const limitRef = useRef(PAGE_SIZE);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);

  const doFetch = useCallback(async (limit: number, isLoadMore = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else if (!hasFetchedRef.current) {
        setLoading(true);
      }

      const data = await fetchHistory(signal, limit);

      if (signal.aborted) return;

      setHistory(data.items);
      setHasMore(data.hasMore);
      setError(null);
      hasFetchedRef.current = true;
    } catch (err) {
      if (signal.aborted) return;
      console.error("Error fetching history:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    limitRef.current = PAGE_SIZE;
    doFetch(PAGE_SIZE);
    return () => abortControllerRef.current?.abort();
  }, [doFetch]);

  // Re-fetch at the current limit when syncTrigger changes
  useEffect(() => {
    if (!hasFetchedRef.current) return;
    doFetch(limitRef.current);
  }, [options?.syncTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    const nextLimit = limitRef.current + PAGE_SIZE;
    limitRef.current = nextLimit;
    doFetch(nextLimit, true);
  }, [doFetch]);

  return {
    history,
    hasMore,
    loading,
    loadingMore,
    error,
    loadMore,
  };
}
