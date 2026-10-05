// What /api/status returns; only the owner's /status page sees it

export interface Place {
  // Loopback or private network, i.e. not through Cloudflare; never has a location
  local: boolean;
  // From Cloudflare: country is always sent; city and region need the
  // "Add visitor location headers" managed transform
  country?: string;
  // State or province, e.g. "Texas"
  region?: string;
  city?: string;
}

export interface ClientInfo extends Place {
  ip: string;
  browser?: string;
  os?: string;
  device: "desktop" | "mobile" | "tablet" | "other";
  bot: boolean;
}

export interface ViewerStatus extends ClientInfo {
  id: string;
  // "stream" holds an SSE connection; "polling" fell back to REST
  mode: "stream" | "polling";
  connectedAt: number;
  lastSeen: number;
}

export type SourceMode = "live" | "polling" | "error" | "connecting";

export interface SourceStatus {
  source: "plex" | "jellyfin";
  mode: SourceMode;
  // When the current mode began
  since: number;
  lastUpdate: number | null;
  failures: number;
  lastError: string | null;
  sessions: number;
}

export interface NowPlayingStatus {
  source: "plex" | "jellyfin";
  user: string;
  title: string;
  player: string;
  state: "playing" | "paused";
}

// Visits since the process started, grouped by where they came from
export interface LocationStat extends Place {
  // Distinct visitors, by hashed IP
  visitors: number;
  visits: number;
  firstSeen: number;
  lastSeen: number;
}

export interface VisitLogEntry extends Place {
  at: number;
  // Short hash of the IP, to tell repeat visitors apart without keeping the IP
  visitor: string;
  browser?: string;
  os?: string;
  device: ClientInfo["device"];
}

export interface MonitorEvent {
  at: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface StatusSnapshot {
  now: number;
  process: {
    startedAt: number;
    node: string;
    rssBytes: number;
    heapUsedBytes: number;
  };
  hub: {
    running: boolean;
    subscribers: number;
    // Set while the hub waits to stop after the last viewer left
    stopsAt: number | null;
  };
  sources: SourceStatus[];
  nowPlaying: NowPlayingStatus[];
  viewers: ViewerStatus[];
  stats: {
    peakViewers: number;
    peakAt: number | null;
    uniqueVisitors24h: number;
    uniqueVisitors7d: number;
    connections24h: number;
  };
  locations: LocationStat[];
  // Newest first
  visits: VisitLogEntry[];
  events: MonitorEvent[];
}
