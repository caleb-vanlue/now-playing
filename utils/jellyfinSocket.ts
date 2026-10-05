import type { SessionsResponse } from "../types/media";
import type { JellyfinSession } from "./jellyfinApi";
import {
  activeJellyfinSessions,
  enrichJellyfinSessions,
  fetchJellyfinSessions,
  jellyfinAuthHeader,
  SessionFeed,
} from "./sessionSources";

// "initialDelayMs,intervalMs": the server pushes the session list on session
// events, at most this often
const SESSIONS_SUBSCRIPTION = "0,1500";
const DEFAULT_KEEPALIVE_TIMEOUT_S = 60;

interface SocketMessage {
  MessageType: string;
  Data?: unknown;
}

// Node's built-in WebSocket (undici) accepts request headers, which Jellyfin
// requires for auth; the DOM typings only know the browser constructor
type NodeWebSocketConstructor = new (
  url: string,
  init?: { headers?: Record<string, string> }
) => WebSocket;

function socketUrl(baseUrl: string): string {
  const url = new URL("socket", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function reconnectDelay(failures: number): number {
  return Math.min(5000 * Math.pow(1.5, failures - 1), 60_000);
}

/**
 * Jellyfin pushes the full session list over its WebSocket whenever playback
 * changes, but sends nothing on subscribe, so each connection is seeded with
 * one REST fetch.
 */
export const jellyfinSessionFeed: SessionFeed = ({ onSessions, onDisconnect }) => {
  const JELLYFIN_URL = process.env.JELLYFIN_URL!;
  const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY!;
  const NodeWebSocket = WebSocket as unknown as NodeWebSocketConstructor;

  let stopped = false;
  let socket: WebSocket | undefined;
  let failures = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let keepAliveTimer: ReturnType<typeof setInterval> | undefined;
  let watchdogTimer: ReturnType<typeof setTimeout> | undefined;
  let watchdogMs = DEFAULT_KEEPALIVE_TIMEOUT_S * 1500;
  // Only the newest update is published; enrichment can finish out of order
  let sequence = 0;

  const clearTimers = () => {
    clearInterval(keepAliveTimer);
    clearTimeout(watchdogTimer);
  };

  const connect = () => {
    let ws: WebSocket;
    try {
      ws = new NodeWebSocket(socketUrl(JELLYFIN_URL), {
        headers: { Authorization: jellyfinAuthHeader(JELLYFIN_API_KEY) },
      });
    } catch (err) {
      // Runs from a timer too, where a throw would take down the server
      console.error("Jellyfin socket could not be created:", err);
      failures++;
      reconnectTimer = setTimeout(connect, reconnectDelay(failures));
      return;
    }
    socket = ws;

    const isCurrent = () => !stopped && socket === ws;

    const publish = async (load: () => Promise<SessionsResponse>) => {
      const id = ++sequence;
      try {
        const data = await load();
        if (isCurrent() && id === sequence) onSessions(data);
      } catch (err) {
        console.error("Jellyfin session update failed:", err);
      }
    };

    // A half-open connection never closes on its own; silence past the
    // keepalive window means it's gone
    const resetWatchdog = () => {
      clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => {
        console.warn("Jellyfin socket went silent; reconnecting");
        ws.close();
        handleClose();
      }, watchdogMs);
    };

    let closed = false;
    const handleClose = () => {
      if (closed || !isCurrent()) return;
      closed = true;
      clearTimers();
      socket = undefined;
      failures++;
      onDisconnect();
      reconnectTimer = setTimeout(connect, reconnectDelay(failures));
    };

    ws.onopen = () => {
      if (!isCurrent()) return;
      failures = 0;
      ws.send(JSON.stringify({ MessageType: "SessionsStart", Data: SESSIONS_SUBSCRIPTION }));
      resetWatchdog();
      publish(fetchJellyfinSessions);
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!isCurrent()) return;
      resetWatchdog();

      let message: SocketMessage;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (message.MessageType === "ForceKeepAlive") {
        const timeoutS = Number(message.Data) || DEFAULT_KEEPALIVE_TIMEOUT_S;
        watchdogMs = timeoutS * 1500;
        resetWatchdog();
        clearInterval(keepAliveTimer);
        keepAliveTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ MessageType: "KeepAlive" }));
          }
        }, (timeoutS * 1000) / 2);
      } else if (message.MessageType === "Sessions" && Array.isArray(message.Data)) {
        const sessions = message.Data as JellyfinSession[];
        publish(() => enrichJellyfinSessions(activeJellyfinSessions(sessions)));
      }
    };

    ws.onerror = () => {
      if (isCurrent() && !closed) console.warn("Jellyfin socket error");
    };
    ws.onclose = handleClose;
  };

  connect();

  return () => {
    stopped = true;
    clearTimers();
    clearTimeout(reconnectTimer);
    socket?.close();
    socket = undefined;
  };
};
