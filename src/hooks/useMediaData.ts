import { useState, useEffect, useCallback, useRef } from "react";
import { MediaData, SessionStreamMessage } from "../../types/media";
import { fetchMediaData, stampSessions } from "../../utils/api";
import { reconcileMediaData, hasActivePlayback } from "../../utils/reconcileMediaData";
import { createSessionGrouper } from "../../utils/groupSessions";

export interface PollingIntervals {
  active: number;
  paused: number;
  idle: number;
}

export interface MediaStatus {
  loading: boolean;
  error: Error | null;
  isConnected: boolean;
  // Updates are pushed from the session stream rather than polled
  live: boolean;
}

const INACTIVITY_THRESHOLD_MS = 10 * 60 * 1000;
const MAX_IDLE_INTERVAL_MS = 10 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "touchstart", "scroll"] as const;

const STREAM_URL = "/api/sessions/stream";
// A stream that hasn't connected by then counts as down
const STREAM_OPEN_TIMEOUT_MS = 10_000;
// Consecutive errors with no message in between before falling back to polling
const STREAM_MAX_FAILURES = 3;
// While polling as a fallback, the stream is retried this often
const STREAM_RETRY_MS = 5 * 60_000;

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
  live: false,
};

// Shared objects so status consumers don't re-render on every healthy update
const LIVE_STATUS: MediaStatus = { loading: false, error: null, isConnected: true, live: true };
const POLLING_STATUS: MediaStatus = { loading: false, error: null, isConnected: true, live: false };

/**
 * Live session data, pushed from the server's session stream. If the stream
 * can't be established, falls back to adaptive polling and retries the stream
 * periodically. All loop state lives inside a single effect, so there are no
 * stale closures, nothing runs while the tab is hidden, and a cancelled
 * request never counts as a failure.
 */
export function useMediaData({ active, paused, idle }: PollingIntervals) {
  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const [status, setStatus] = useState<MediaStatus>(INITIAL_STATUS);
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    const intervals = { active, paused, idle };
    let snapshot: MediaData | null = null;
    const groupSessions = createSessionGrouper();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let retryCount = 0;
    let lastActivity = Date.now();
    let stream: EventSource | undefined;
    let streamTimer: ReturnType<typeof setTimeout> | undefined;
    let streamFailures = 0;
    let streamBlockedUntil = 0;

    const apply = (next: MediaData, live: boolean): MediaData => {
      const current = reconcileMediaData(snapshot, next);
      snapshot = current;
      // Same reference when nothing changed, so React bails out of the render
      setMediaData(groupSessions(current));
      setStatus(live ? LIVE_STATUS : POLLING_STATUS);
      return current;
    };

    const fail = (err: unknown) => {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error("An unknown error occurred"),
        isConnected: false,
        live: false,
      }));
    };

    const closeStream = () => {
      clearTimeout(streamTimer);
      stream?.close();
      stream = undefined;
    };

    // Prefer the stream unless it recently failed
    const resume = () => {
      if (Date.now() >= streamBlockedUntil) openStream();
      else poll();
    };

    const schedule = (delay: number) => {
      clearTimeout(timer);
      // Hidden tabs don't poll; visibility change triggers a fresh fetch instead
      if (!document.hidden) timer = setTimeout(resume, delay);
    };

    const fallBackToPolling = () => {
      console.warn("Session stream unavailable; falling back to polling");
      closeStream();
      streamFailures = 0;
      streamBlockedUntil = Date.now() + STREAM_RETRY_MS;
      poll();
    };

    const openStream = (refresh = false) => {
      closeStream();
      clearTimeout(timer);
      controller?.abort();

      const es = new EventSource(refresh ? `${STREAM_URL}?refresh=1` : STREAM_URL);
      stream = es;
      streamTimer = setTimeout(fallBackToPolling, STREAM_OPEN_TIMEOUT_MS);

      // The first message waits on the server's first upstream fetch, so only
      // the connection itself is timed
      es.onopen = () => clearTimeout(streamTimer);

      es.onmessage = (event: MessageEvent<string>) => {
        streamFailures = 0;
        retryCount = 0;
        try {
          const message: SessionStreamMessage = JSON.parse(event.data);
          // The server keeps retrying its sources; keep showing the last data meanwhile
          if (message.error) fail(new Error(message.error));
          else apply(stampSessions(message.sessions), true);
        } catch (err) {
          console.error("Invalid session stream message:", err);
        }
      };

      // EventSource reconnects by itself; only give up after repeated failures
      // or when the server rejects the stream outright
      es.onerror = () => {
        if (stream !== es) return;
        streamFailures++;
        if (es.readyState === EventSource.CLOSED || streamFailures >= STREAM_MAX_FAILURES) {
          fallBackToPolling();
        }
      };
    };

    const poll = async () => {
      clearTimeout(timer);
      controller?.abort();
      const current = new AbortController();
      controller = current;

      try {
        const next = await fetchMediaData(current.signal);
        if (current.signal.aborted) return;

        retryCount = 0;
        schedule(getPollingInterval(apply(next, false), lastActivity, intervals));
      } catch (err) {
        // Superseded by a newer poll or unmounted; that owner handles scheduling
        if (current.signal.aborted) return;

        console.error("Error fetching media data:", err);
        retryCount++;
        fail(err);
        schedule(getRetryDelay(retryCount));
      }
    };

    const onActivity = () => {
      lastActivity = Date.now();
    };

    const onVisibilityChange = () => {
      // Hidden tabs hold no connection; reopening delivers a fresh snapshot
      if (document.hidden) {
        clearTimeout(timer);
        closeStream();
      } else {
        resume();
      }
    };

    refreshRef.current = () => {
      retryCount = 0;
      lastActivity = Date.now();
      if (Date.now() >= streamBlockedUntil) openStream(true);
      else poll();
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true })
    );
    document.addEventListener("visibilitychange", onVisibilityChange);
    resume();

    return () => {
      clearTimeout(timer);
      closeStream();
      controller?.abort();
      refreshRef.current = () => {};
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [active, paused, idle]);

  const refreshData = useCallback(() => refreshRef.current(), []);

  return { mediaData, status, refreshData };
}
