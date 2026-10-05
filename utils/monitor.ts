import { createHash, randomUUID } from "node:crypto";
import { BlockList, isIP } from "node:net";
import { userAgent } from "next/server";
import type { ClientInfo, MonitorEvent, ViewerStatus } from "../types/status";

// A polling client that hasn't fetched for this long has left. The slowest
// fallback interval is 5 min, so idle pollers drop off between polls
const POLLER_TIMEOUT_MS = 6 * 60_000;
const MAX_EVENTS = 100;
const DAY_MS = 24 * 60 * 60_000;
const WEEK_MS = 7 * DAY_MS;

/**
 * In-memory record of who is watching, for the owner's status page. Nothing
 * is persisted, so stats cover the time since the process started.
 */
class Monitor {
  readonly startedAt = Date.now();
  private streams = new Map<string, ViewerStatus>();
  private pollers = new Map<string, ViewerStatus>();
  private events: MonitorEvent[] = [];
  // Visitor key → last seen; keys are hashed so raw IPs don't outlive a visit
  private visitors = new Map<string, number>();
  private connections: number[] = [];
  private peak = { count: 0, at: null as number | null };

  /** Registers an SSE connection; call the returned function when it closes. */
  trackStream(client: ClientInfo): () => void {
    const now = Date.now();
    const id = randomUUID();
    this.streams.set(id, { ...client, id, mode: "stream", connectedAt: now, lastSeen: now });
    // It may have been polling until the stream came back
    this.pollers.delete(clientKey(client));
    this.noteVisit(client, now);
    return () => {
      this.streams.delete(id);
    };
  }

  /** Records a polling-fallback session fetch. */
  recordPoll(client: ClientInfo): void {
    const now = Date.now();
    const key = clientKey(client);
    const existing = this.pollers.get(key);
    if (existing) {
      existing.lastSeen = now;
      return;
    }
    this.pollers.set(key, { ...client, id: key, mode: "polling", connectedAt: now, lastSeen: now });
    this.noteVisit(client, now);
  }

  log(level: MonitorEvent["level"], message: string): void {
    this.events.push({ at: Date.now(), level, message });
    if (this.events.length > MAX_EVENTS) this.events.shift();
  }

  viewers(): ViewerStatus[] {
    this.prune(Date.now());
    return [...this.streams.values(), ...this.pollers.values()].sort(
      (a, b) => a.connectedAt - b.connectedAt
    );
  }

  stats() {
    const now = Date.now();
    this.prune(now);
    let day = 0;
    for (const lastSeen of this.visitors.values()) if (now - lastSeen < DAY_MS) day++;
    return {
      peakViewers: this.peak.count,
      peakAt: this.peak.at,
      uniqueVisitors24h: day,
      uniqueVisitors7d: this.visitors.size,
      connections24h: this.connections.length,
    };
  }

  recentEvents(): MonitorEvent[] {
    return [...this.events].reverse();
  }

  private noteVisit(client: ClientInfo, now: number): void {
    if (client.bot) return;
    this.visitors.set(hashKey(client.ip), now);
    this.connections.push(now);
    const count = this.streams.size + this.pollers.size;
    if (count > this.peak.count) this.peak = { count, at: now };
  }

  private prune(now: number): void {
    for (const [key, poller] of this.pollers) {
      if (now - poller.lastSeen > POLLER_TIMEOUT_MS) this.pollers.delete(key);
    }
    for (const [key, lastSeen] of this.visitors) {
      if (now - lastSeen > WEEK_MS) this.visitors.delete(key);
    }
    while (this.connections.length && now - this.connections[0] > DAY_MS) {
      this.connections.shift();
    }
  }
}

function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function clientKey(client: ClientInfo): string {
  return hashKey(`${client.ip}|${client.browser}|${client.os}|${client.device}`);
}

// Loopback, private, CGNAT (Tailscale and similar) and link-local ranges
const LOCAL_RANGES = new BlockList();
for (const [network, prefix] of [
  ["127.0.0.0", 8],
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["100.64.0.0", 10],
  ["169.254.0.0", 16],
] as const) {
  LOCAL_RANGES.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
] as const) {
  LOCAL_RANGES.addSubnet(network, prefix, "ipv6");
}

// Node reports IPv4 clients on dual-stack sockets as ::ffff:a.b.c.d
function normalizeIp(ip: string): string {
  return ip.toLowerCase().startsWith("::ffff:") && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
}

function isLocalIp(ip: string): boolean {
  const family = isIP(ip);
  return family !== 0 && LOCAL_RANGES.check(ip, family === 4 ? "ipv4" : "ipv6");
}

interface HasHeaders {
  headers: Headers;
}

function header(request: HasHeaders, name: string): string | undefined {
  const value = request.headers.get(name)?.trim();
  return value || undefined;
}

/**
 * Who sent a request. Behind Cloudflare the IP and location come from its
 * headers; anyone reaching the origin directly could spoof them, which only
 * matters for these stats.
 */
export function describeClient(request: HasHeaders): ClientInfo {
  const forwarded = header(request, "x-forwarded-for")?.split(",")[0]?.trim();
  const ip = normalizeIp(
    header(request, "cf-connecting-ip") ?? forwarded ?? header(request, "x-real-ip") ?? "unknown"
  );

  // XX = unknown, T1 = Tor
  const rawCountry = header(request, "cf-ipcountry");
  const country = rawCountry && rawCountry !== "XX" ? rawCountry : undefined;

  const ua = userAgent(request);
  const deviceType = ua.device.type;
  const device: ClientInfo["device"] =
    deviceType === undefined
      ? "desktop"
      : deviceType === "mobile" || deviceType === "tablet"
        ? deviceType
        : "other";

  return {
    ip,
    local: isLocalIp(ip),
    country,
    region: header(request, "cf-region"),
    city: header(request, "cf-ipcity"),
    browser: ua.browser.name,
    os: ua.os.name,
    device,
    bot: ua.isBot,
  };
}

// Shared across route bundles and dev hot reloads, like the session hub
const globalForMonitor = globalThis as typeof globalThis & { __monitor?: Monitor };

export const monitor = (globalForMonitor.__monitor ??= new Monitor());
