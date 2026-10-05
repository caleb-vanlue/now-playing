"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "../../app/status/actions";
import { useNow } from "../../hooks/useNow";
import type {
  ClientInfo,
  LocationStat,
  MonitorEvent,
  Place,
  SourceMode,
  SourceStatus,
  StatusSnapshot,
  ViewerStatus,
  VisitLogEntry,
} from "../../../types/status";

const REFRESH_MS = 5_000;

const SOURCE_LABELS = { plex: "Plex", jellyfin: "Jellyfin" } as const;

const MODE_STYLES: Record<SourceMode, { label: string; dot: string; text: string }> = {
  live: { label: "Live", dot: "bg-emerald-400", text: "text-emerald-400" },
  polling: { label: "Polling", dot: "bg-amber-400", text: "text-amber-400" },
  connecting: { label: "Connecting", dot: "bg-sky-400", text: "text-sky-400" },
  error: { label: "Unreachable", dot: "bg-red-500", text: "text-red-400" },
};

const EVENT_COLORS: Record<MonitorEvent["level"], string> = {
  info: "text-gray-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

function formatClock(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

// Regional-indicator letters render as the country's flag
function flag(place: Place): string {
  const { country } = place;
  if (place.local) return "🏠";
  if (!country || !/^[A-Z]{2}$/.test(country) || country === "T1") return "🌐";
  return String.fromCodePoint(...[...country].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

function location(place: Place): string {
  if (place.local) return "Local network";
  if (place.country === "T1") return "Tor";
  const parts = [place.city, place.region, place.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Unknown";
}

function formatDateTime(at: number): string {
  return new Date(at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function deviceLabel(client: Pick<ClientInfo, "browser" | "os" | "bot">): string {
  const software = [client.browser, client.os && `on ${client.os}`].filter(Boolean).join(" ");
  const label = software || "Unknown browser";
  return client.bot ? `${label} (bot)` : label;
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl bg-[var(--card-background)] p-4 ${className}`}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return (
    <div className="rounded-xl bg-[var(--card-background)] p-4">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {detail && <div className="mt-0.5 text-xs text-gray-500">{detail}</div>}
    </div>
  );
}

function SourceRow({ source, now }: { source: SourceStatus; now: number }) {
  const mode = MODE_STYLES[source.mode];
  return (
    <div className="rounded-lg bg-[var(--background)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{SOURCE_LABELS[source.source]}</span>
        <span className={`flex items-center gap-1.5 text-sm ${mode.text}`}>
          <span className={`h-2 w-2 rounded-full ${mode.dot}`} />
          {mode.label}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-gray-400">For</dt>
        <dd className="tabular-nums">{formatDuration(now - source.since)}</dd>
        <dt className="text-gray-400">Last update</dt>
        <dd className="tabular-nums">
          {source.lastUpdate ? `${formatDuration(now - source.lastUpdate)} ago` : "—"}
        </dd>
        <dt className="text-gray-400">Sessions</dt>
        <dd className="tabular-nums">{source.sessions}</dd>
        {source.failures > 0 && (
          <>
            <dt className="text-gray-400">Failures</dt>
            <dd className="tabular-nums text-red-400">{source.failures}</dd>
          </>
        )}
      </dl>
      {source.lastError && <p className="mt-2 break-words text-xs text-red-400">{source.lastError}</p>}
    </div>
  );
}

function ViewerRow({ viewer, now }: { viewer: ViewerStatus; now: number }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="text-xl leading-none" aria-hidden="true">
        {flag(viewer)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{location(viewer)}</div>
        <div className="truncate text-xs text-gray-400">
          {deviceLabel(viewer)} · {viewer.device} · <span className="font-mono">{viewer.ip}</span>
        </div>
      </div>
      <div className="shrink-0 text-right text-xs">
        <div className={viewer.mode === "stream" ? "text-emerald-400" : "text-amber-400"}>
          {viewer.mode === "stream" ? "Live" : "Polling"}
        </div>
        <div className="tabular-nums text-gray-400">{formatDuration(now - viewer.connectedAt)}</div>
      </div>
    </li>
  );
}

function LocationsCard({
  locations,
  visits,
  startedAt,
  now,
  mounted,
}: {
  locations: LocationStat[];
  visits: VisitLogEntry[];
  startedAt: number;
  now: number;
  mounted: boolean;
}) {
  const [tab, setTab] = useState<"locations" | "log">("locations");
  const tabClass = (active: boolean) =>
    `rounded-md px-2.5 py-1 text-xs ${active ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200"}`;

  return (
    <Card title={`Visitors since ${mounted ? formatDateTime(startedAt) : "start"}`}>
      <div className="mb-3 flex gap-1" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "locations"} className={tabClass(tab === "locations")} onClick={() => setTab("locations")}>
          Locations ({locations.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "log"} className={tabClass(tab === "log")} onClick={() => setTab("log")}>
          Visit log ({visits.length})
        </button>
      </div>

      {tab === "locations" ? (
        locations.length === 0 ? (
          <p className="text-sm text-gray-400">No visitors yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--card-background)] text-left text-xs text-gray-400">
                <tr>
                  <th className="py-1 font-normal">Location</th>
                  <th className="py-1 text-right font-normal">Visitors</th>
                  <th className="py-1 text-right font-normal">Visits</th>
                  <th className="py-1 pl-3 text-right font-normal">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {locations.map((stat) => (
                  <tr key={`${stat.local}|${stat.country}|${stat.region}|${stat.city}`}>
                    <td className="max-w-0 py-1.5">
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">{flag(stat)}</span>
                        <span className="truncate">{location(stat)}</span>
                      </div>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{stat.visitors}</td>
                    <td className="py-1.5 text-right tabular-nums">{stat.visits}</td>
                    <td
                      className="whitespace-nowrap py-1.5 pl-3 text-right tabular-nums text-gray-400"
                      title={mounted ? `First seen ${formatDateTime(stat.firstSeen)}` : undefined}
                    >
                      {formatDuration(now - stat.lastSeen)} ago
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : visits.length === 0 ? (
        <p className="text-sm text-gray-400">No visits yet.</p>
      ) : (
        <ol className="max-h-96 divide-y divide-white/5 overflow-y-auto">
          {visits.map((visit) => (
            <li key={`${visit.at}-${visit.visitor}`} className="flex items-center gap-3 py-1.5 text-sm">
              <span className="w-24 shrink-0 text-xs tabular-nums text-gray-500">
                {mounted ? formatDateTime(visit.at) : ""}
              </span>
              <span aria-hidden="true">{flag(visit)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate">{location(visit)}</div>
                <div className="truncate text-xs text-gray-400">
                  {deviceLabel({ ...visit, bot: false })} · {visit.device}
                </div>
              </div>
              <span className="shrink-0 font-mono text-xs text-gray-500" title="Visitor ID (hashed IP)">
                {visit.visitor}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export default function StatusDashboard({ initial }: { initial: StatusSnapshot }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  // Server clock minus client clock, so durations don't depend on the two agreeing
  const [skew, setSkew] = useState(0);
  const [stale, setStale] = useState(false);
  const clientNow = useNow(1_000);
  // Locale-formatted times wait for the client so they use the viewer's time zone
  const mounted = clientNow !== 0;
  const now = mounted ? clientNow + skew : snapshot.now;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      clearTimeout(timer);
      if (document.hidden) return;
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (res.status === 401) {
          // Key changed or cookie expired: show the login form
          router.refresh();
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const next: StatusSnapshot = await res.json();
        if (cancelled) return;
        setSnapshot(next);
        setSkew(next.now - Date.now());
        setStale(false);
      } catch {
        if (!cancelled) setStale(true);
      }
      if (!cancelled) timer = setTimeout(load, REFRESH_MS);
    };

    const onVisibility = () => {
      if (!document.hidden) load();
    };

    timer = setTimeout(load, REFRESH_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  const { hub, sources, viewers, stats, nowPlaying, locations, visits, events } = snapshot;
  const streaming = viewers.filter((v) => v.mode === "stream").length;
  // Cloudflare sent a country but no state or city: its location headers are off
  const missingLocation = viewers.some(
    (v) => !v.local && v.country && v.country !== "T1" && !v.region && !v.city
  );
  const polling = viewers.length - streaming;

  return (
    // body doesn't scroll (the dashboard scrolls its own container), so this page needs its own
    <div className="h-dvh overflow-y-auto">
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Instance status</h1>
            <p className="text-sm text-gray-400">
              Up {formatDuration(now - snapshot.process.startedAt)} · updated {mounted ? formatClock(snapshot.now) : "…"}
              {stale && <span className="text-amber-400"> · can&apos;t reach server</span>}
            </p>
          </div>
          <form action={logout}>
            <button type="submit" className="rounded-lg px-3 py-1.5 text-sm text-gray-300 ring-1 ring-white/10 hover:bg-white/5">
              Sign out
            </button>
          </form>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Viewers now"
            value={viewers.length}
            detail={polling ? `${streaming} live · ${polling} polling` : `${streaming} live`}
          />
          <Stat
            label="Peak viewers"
            value={stats.peakViewers}
            detail={stats.peakAt && mounted ? `at ${new Date(stats.peakAt).toLocaleString()}` : "since start"}
          />
          <Stat
            label="Unique visitors"
            value={stats.uniqueVisitors24h}
            detail={`24 h · ${stats.uniqueVisitors7d} in 7 d`}
          />
          <Stat label="Connections" value={stats.connections24h} detail="last 24 h" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Media servers">
            <div className="space-y-3">
              {sources.length === 0 ? (
                <p className="text-sm text-gray-400">
                  {hub.running ? "No media servers configured." : "Idle: connects when someone opens the dashboard."}
                </p>
              ) : (
                sources.map((source) => <SourceRow key={source.source} source={source} now={now} />)
              )}
            </div>
          </Card>

          <Card title={`Viewers (${viewers.length})`} className="lg:col-span-2">
            {viewers.length === 0 ? (
              <p className="text-sm text-gray-400">Nobody is watching the dashboard.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {viewers.map((viewer) => (
                  <ViewerRow key={viewer.id} viewer={viewer} now={now} />
                ))}
              </ul>
            )}
            {missingLocation && (
              <p className="mt-3 text-xs text-gray-500">
                For state and city, turn on Cloudflare&apos;s Rules → Managed Transforms → Add visitor
                location headers.
              </p>
            )}
          </Card>
        </div>

        <LocationsCard
          locations={locations}
          visits={visits}
          startedAt={snapshot.process.startedAt}
          now={now}
          mounted={mounted}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card title={`Now playing (${nowPlaying.length})`}>
            {nowPlaying.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing playing.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {nowPlaying.map((item, i) => (
                  <li key={i}>
                    <div className="truncate">{item.title}</div>
                    <div className="truncate text-xs text-gray-400">
                      {item.user} · {item.player} · {SOURCE_LABELS[item.source]}
                      {item.state === "paused" && " · paused"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Events" className="lg:col-span-2">
            {events.length === 0 ? (
              <p className="text-sm text-gray-400">No events yet.</p>
            ) : (
              <ol className="max-h-80 space-y-1 overflow-y-auto font-mono text-xs">
                {events.map((event, i) => (
                  <li key={`${event.at}-${i}`} className="flex gap-3">
                    <span className="shrink-0 text-gray-500 tabular-nums">{mounted ? formatClock(event.at) : ""}</span>
                    <span className={EVENT_COLORS[event.level]}>{event.message}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <Card title="Process">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            <dt className="text-gray-400">Session hub</dt>
            <dd>
              {hub.running
                ? hub.stopsAt
                  ? `stopping in ${formatDuration(hub.stopsAt - now)}`
                  : `running · ${hub.subscribers} subscriber${hub.subscribers === 1 ? "" : "s"}`
                : "idle"}
            </dd>
            <dt className="text-gray-400">Memory</dt>
            <dd className="tabular-nums">
              {formatBytes(snapshot.process.rssBytes)} RSS · {formatBytes(snapshot.process.heapUsedBytes)} heap
            </dd>
            <dt className="text-gray-400">Node</dt>
            <dd>{snapshot.process.node}</dd>
            <dt className="text-gray-400">Started</dt>
            <dd>{mounted ? new Date(snapshot.process.startedAt).toLocaleString() : ""}</dd>
          </dl>
        </Card>
      </main>
    </div>
  );
}
