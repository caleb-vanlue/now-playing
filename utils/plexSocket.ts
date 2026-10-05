import {
  collectPlexSessions,
  mapPlexSession,
  mapPlexState,
  PlexSessionEntry,
} from "./plexApi";
import { fetchRawPlexSessions, SessionFeed } from "./sessionSources";
import { openWebSocket, reconnectDelay, webSocketUrl } from "./upstreamSocket";

// A burst of notifications for new sessions shares one metadata fetch
const RESYNC_DEBOUNCE_MS = 300;
// Floor between notification-triggered fetches, in case a notified session
// never shows up in /status/sessions
const RESYNC_MIN_GAP_MS = 5_000;
// Notifications don't carry transcode or stream changes, and one can be missed
const SAFETY_RESYNC_MS = 5 * 60_000;

interface PlayNotification {
  sessionKey?: string;
  ratingKey?: string;
  state?: string;
  viewOffset?: number;
}

interface NotificationMessage {
  NotificationContainer?: {
    type?: string;
    PlaySessionStateNotification?: PlayNotification[];
  };
}

interface TrackedSession {
  entry: PlexSessionEntry;
  // When entry's viewOffset was reported
  observedAt: number;
}

function withPlayback(
  entry: PlexSessionEntry,
  state: "playing" | "paused",
  viewOffset: number | undefined
): PlexSessionEntry {
  return { ...entry, item: { ...entry.item, state, viewOffset } } as PlexSessionEntry;
}

// Sessions report at different moments, but the hub treats a snapshot as
// observed all at once, so playing offsets are brought up to `now`
function currentEntry({ entry, observedAt }: TrackedSession, now: number): PlexSessionEntry {
  const { state, viewOffset, duration } = entry.item;
  if (state !== "playing" || now <= observedAt) return entry;
  const projected = (viewOffset ?? 0) + (now - observedAt);
  return withPlayback(entry, state, duration ? Math.min(projected, duration) : projected);
}

/**
 * Plex notifies about playback roughly every 10 s per session with only its
 * key, item, state and position. Known sessions are patched in place; a new
 * session or item triggers one /status/sessions fetch for full metadata. Each
 * connection is seeded with a fetch, since nothing is sent on connect.
 */
export const plexSessionFeed: SessionFeed = ({ onSessions, onDisconnect }) => {
  const PLEX_URL = process.env.PLEX_URL!;
  const PLEX_TOKEN = process.env.PLEX_TOKEN!;

  let stopped = false;
  let socket: WebSocket | undefined;
  let failures = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let resyncTimer: ReturnType<typeof setTimeout> | undefined;
  let safetyTimer: ReturnType<typeof setInterval> | undefined;

  // Keyed by sessionKey, which is what notifications carry
  let sessions = new Map<string, TrackedSession>();
  // Entries reflect a fetch made on the current connection
  let synced = false;
  let fetching = false;
  let fetchQueued = false;
  let lastFetch = 0;
  // A fetch in flight may still list sessions that stopped meanwhile
  const stoppedDuringFetch = new Set<string>();

  const publish = () => {
    const now = Date.now();
    onSessions(collectPlexSessions([...sessions.values()].map((s) => currentEntry(s, now))));
  };

  const resync = async () => {
    clearTimeout(resyncTimer);
    resyncTimer = undefined;
    if (fetching) {
      fetchQueued = true;
      return;
    }

    const ws = socket;
    fetching = true;
    stoppedDuringFetch.clear();
    try {
      const raw = await fetchRawPlexSessions();
      if (stopped || !ws || socket !== ws) return;

      const observedAt = Date.now();
      const next = new Map<string, TrackedSession>();
      for (const session of raw) {
        if (!session.sessionKey || stoppedDuringFetch.has(session.sessionKey)) continue;
        const entry = mapPlexSession(session);
        if (entry) next.set(session.sessionKey, { entry, observedAt });
      }
      sessions = next;
      synced = true;
      publish();
    } catch (err) {
      console.error("Plex session resync failed:", err);
    } finally {
      fetching = false;
      lastFetch = Date.now();
      if (fetchQueued) {
        fetchQueued = false;
        requestResync();
      }
    }
  };

  const requestResync = () => {
    if (resyncTimer || stopped) return;
    const delay = Math.max(RESYNC_DEBOUNCE_MS, lastFetch + RESYNC_MIN_GAP_MS - Date.now());
    resyncTimer = setTimeout(resync, delay);
  };

  const onNotifications = (notifications: PlayNotification[]) => {
    // Until the seed fetch lands there's nothing to patch; it covers these too
    if (!synced) {
      requestResync();
      return;
    }

    let changed = false;
    for (const n of notifications) {
      if (!n.sessionKey) continue;

      if (n.state === "stopped") {
        if (fetching) stoppedDuringFetch.add(n.sessionKey);
        if (sessions.delete(n.sessionKey)) changed = true;
        continue;
      }

      const tracked = sessions.get(n.sessionKey);
      if (!tracked || tracked.entry.item.id !== n.ratingKey) {
        requestResync();
        continue;
      }

      const { entry } = tracked;
      sessions.set(n.sessionKey, {
        entry: withPlayback(entry, mapPlexState(n.state), n.viewOffset ?? entry.item.viewOffset),
        observedAt: Date.now(),
      });
      changed = true;
    }
    if (changed) publish();
  };

  const connect = () => {
    let ws: WebSocket;
    try {
      ws = openWebSocket(webSocketUrl(PLEX_URL, ":/websockets/notifications"), {
        "X-Plex-Token": PLEX_TOKEN,
        "X-Plex-Client-Identifier": "NowPlaying-Dashboard",
      });
    } catch (err) {
      // Runs from a timer too, where a throw would take down the server
      console.error("Plex socket could not be created:", err);
      failures++;
      reconnectTimer = setTimeout(connect, reconnectDelay(failures));
      return;
    }
    socket = ws;
    synced = false;

    const isCurrent = () => !stopped && socket === ws;

    let closed = false;
    const handleClose = () => {
      if (closed || !isCurrent()) return;
      closed = true;
      clearInterval(safetyTimer);
      clearTimeout(resyncTimer);
      resyncTimer = undefined;
      socket = undefined;
      synced = false;
      failures++;
      onDisconnect();
      reconnectTimer = setTimeout(connect, reconnectDelay(failures));
    };

    ws.onopen = () => {
      if (!isCurrent()) return;
      failures = 0;
      clearInterval(safetyTimer);
      safetyTimer = setInterval(resync, SAFETY_RESYNC_MS);
      resync();
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!isCurrent()) return;
      let message: NotificationMessage;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      const container = message.NotificationContainer;
      if (container?.type === "playing" && container.PlaySessionStateNotification) {
        onNotifications(container.PlaySessionStateNotification);
      }
    };

    ws.onerror = () => {
      if (isCurrent() && !closed) console.warn("Plex socket error");
    };
    ws.onclose = handleClose;
  };

  connect();

  return () => {
    stopped = true;
    clearInterval(safetyTimer);
    clearTimeout(resyncTimer);
    clearTimeout(reconnectTimer);
    socket?.close();
    socket = undefined;
  };
};
