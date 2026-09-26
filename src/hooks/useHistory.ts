import { useState, useEffect, useCallback, useRef } from "react";
import { HistoryData } from "../../types/media";
import { fetchHistory } from "../../utils/api";

const PAGE_SIZE = 25;
const EMPTY: HistoryData["items"] = [];

interface UseHistoryOptions {
  // Only fetch while the history view is visible
  active: boolean;
  // Changes whenever sessions start/stop; history can only grow when one ends
  revision: string;
}

export function useHistory({ active, revision }: UseHistoryOptions) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const limitRef = useRef(PAGE_SIZE);
  const fetchedRevisionRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // State is only set after the request settles, never synchronously
  const load = useCallback(async (limit: number) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const result = await fetchHistory(controller.signal, limit);
      if (controller.signal.aborted) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("Error fetching history:", err);
      // Allow a retry the next time the view activates
      fetchedRevisionRef.current = null;
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!active || fetchedRevisionRef.current === revision) return;
    fetchedRevisionRef.current = revision;
    load(limitRef.current);
  }, [active, revision, load]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const loadMore = useCallback(() => {
    limitRef.current += PAGE_SIZE;
    setLoadingMore(true);
    load(limitRef.current);
  }, [load]);

  return {
    history: data?.items ?? EMPTY,
    hasMore: data?.hasMore ?? false,
    loading: data === null && error === null,
    loadingMore,
    error,
    loadMore,
  };
}
