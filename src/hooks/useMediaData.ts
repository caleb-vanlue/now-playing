import { useState, useEffect, useCallback, useRef } from "react";
import { MediaData } from "../../types/media";
import { fetchMediaData } from "../../utils/api";
import { reconcileMediaData, hasActivePlayback } from "../../utils/reconcileMediaData";

export interface PollingIntervals {
  active: number;
  paused: number;
  idle: number;
}

export interface MediaStatus {
  loading: boolean;
  error: Error | null;
  isConnected: boolean;
  lastSyncTime: number | null;
}

const INACTIVITY_THRESHOLD_MS = 10 * 60 * 1000;
const MAX_IDLE_INTERVAL_MS = 10 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "touchstart", "scroll"] as const;

function getPollingInterval(
  data: MediaData,
  lastActivity: number,
  intervals: PollingIntervals
): number {
  if (Date.now() - lastActivity > INACTIVITY_THRESHOLD_MS) {
    return Math.min(intervals.idle * 2, MAX_IDLE_INTERVAL_MS);
  }
  if (hasActivePlayback(data)) return intervals.active;

  const hasAnySession =
    data.tracks.length > 0 || data.movies.length > 0 || data.episodes.length > 0;
  return hasAnySession ? intervals.paused : intervals.idle;
}

function getRetryDelay(attempt: number): number {
  return Math.min(5000 * Math.pow(1.5, attempt - 1), 60000);
}

const INITIAL_STATUS: MediaStatus = {
  loading: true,
  error: null,
  isConnected: true,
  lastSyncTime: null,
};

/**
 * Adaptive polling for active sessions. All loop state lives inside a single
 * effect, so there are no stale closures, polling pauses while the tab is
 * hidden, and a cancelled request never counts as a failure.
 */
export function useMediaData({ active, paused, idle }: PollingIntervals) {
  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const [status, setStatus] = useState<MediaStatus>(INITIAL_STATUS);
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    const intervals = { active, paused, idle };
    let snapshot: MediaData | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let retryCount = 0;
    let lastActivity = Date.now();

    const schedule = (delay: number) => {
      clearTimeout(timer);
      // Hidden tabs don't poll; visibility change triggers a fresh fetch instead
      if (!document.hidden) timer = setTimeout(poll, delay);
    };

    const poll = async () => {
      clearTimeout(timer);
      controller?.abort();
      const current = new AbortController();
      controller = current;

      try {
        const next = await fetchMediaData(current.signal);
        if (current.signal.aborted) return;

        snapshot = reconcileMediaData(snapshot, next);
        retryCount = 0;
        // Same reference when nothing changed, so React bails out of the render
        setMediaData(snapshot);
        setStatus({ loading: false, error: null, isConnected: true, lastSyncTime: Date.now() });
        schedule(getPollingInterval(snapshot, lastActivity, intervals));
      } catch (err) {
        // Superseded by a newer poll or unmounted; that owner handles scheduling
        if (current.signal.aborted) return;

        console.error("Error fetching media data:", err);
        retryCount++;
        setStatus((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err : new Error("An unknown error occurred"),
          isConnected: false,
        }));
        schedule(getRetryDelay(retryCount));
      }
    };

    const onActivity = () => {
      lastActivity = Date.now();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timer);
      } else {
        poll();
      }
    };

    refreshRef.current = () => {
      retryCount = 0;
      lastActivity = Date.now();
      poll();
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true })
    );
    document.addEventListener("visibilitychange", onVisibilityChange);
    poll();

    return () => {
      clearTimeout(timer);
      controller?.abort();
      refreshRef.current = () => {};
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [active, paused, idle]);

  const refreshData = useCallback(() => refreshRef.current(), []);

  return { mediaData, status, refreshData };
}
