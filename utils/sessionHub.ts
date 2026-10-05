import type {
  BaseMedia,
  SessionItem,
  SessionsResponse,
  SessionStreamMessage,
} from "../types/media";
import {
  configuredSources,
  SESSION_FETCHERS,
  SessionFeed,
  SessionSource,
} from "./sessionSources";
import { jellyfinSessionFeed } from "./jellyfinSocket";

// Sources with a live upstream connection; the rest are polled
const FEEDS: Partial<Record<SessionSource, SessionFeed>> = {
  jellyfin: jellyfinSessionFeed,
};

const POLL_PLAYING_MS = 10_000;
const POLL_IDLE_MS = 30_000;
// A feed that hasn't delivered by then is backed up by polling
const FEED_CONNECT_GRACE_MS = 5_000;
// Upstream work stops this long after the last viewer leaves; a page reload
// shouldn't tear everything down
const IDLE_SHUTDOWN_MS = 2 * 60_000;
// Coalesces near-simultaneous source updates into one push
const BROADCAST_DELAY_MS = 100;
// A manual refresh within this window of the last fetch reuses it
const REFRESH_MIN_GAP_MS = 2_000;
// Viewers interpolate playing progress, so a fresh offset within this much of
// the interpolated one isn't worth pushing
const PROGRESS_TOLERANCE_MS = 2_000;

type Listener = (message: SessionStreamMessage) => void;
type Item = SessionItem<BaseMedia>;
type Category = keyof SessionsResponse;

const CATEGORIES: Category[] = ["tracks", "movies", "episodes"];

const SOURCE_LABELS: Record<SessionSource, string> = { plex: "Plex", jellyfin: "Jellyfin" };

interface SourceState {
  // What viewers were last sent, so change detection compares against what
  // they're actually interpolating from
  data: SessionsResponse | null;
  // When data's viewOffsets were current
  observedAt: number;
  error: Error | null;
  // Has completed at least one fetch since the hub started
  settled: boolean;
  fetching: boolean;
  lastFetch: number;
  failures: number;
  timer?: ReturnType<typeof setTimeout>;
  // The feed is connected and delivering, so polling is paused
  live: boolean;
  stopFeed?: () => void;
}

function hasPlaying(data: SessionsResponse | null): boolean {
  return !!data && CATEGORIES.some((c) => data[c].some((item) => item.state === "playing"));
}

function retryDelay(failures: number): number {
  return Math.min(5000 * Math.pow(1.5, failures - 1), 60_000);
}

function withoutOffset(item: Item): string {
  return JSON.stringify({ ...item, viewOffset: 0 });
}

function isMeaningfulChange(
  prev: SessionsResponse,
  prevAt: number,
  next: SessionsResponse,
  nextAt: number
): boolean {
  return CATEGORIES.some((category) => {
    const prevItems: Item[] = prev[category];
    const nextItems: Item[] = next[category];
    if (prevItems.length !== nextItems.length) return true;

    const prevBySession = new Map(prevItems.map((item) => [item.sessionId, item]));
    return nextItems.some((item) => {
      const old = prevBySession.get(item.sessionId);
      if (!old || withoutOffset(old) !== withoutOffset(item)) return true;

      const oldOffset = old.viewOffset ?? 0;
      const offset = item.viewOffset ?? 0;
      if (item.state !== "playing") return offset !== oldOffset;

      const projected = oldOffset + (nextAt - prevAt);
      const expected = item.duration ? Math.min(projected, item.duration) : projected;
      return Math.abs(offset - expected) > PROGRESS_TOLERANCE_MS;
    });
  });
}

// Moves playing items' offsets forward to `now`, so a viewer joining between
// fetches starts from the current position
function advance<T extends Item>(items: T[], elapsed: number): T[] {
  if (elapsed <= 0) return items;
  return items.map((item) => {
    if (item.state !== "playing") return item;
    const projected = (item.viewOffset ?? 0) + elapsed;
    return { ...item, viewOffset: item.duration ? Math.min(projected, item.duration) : projected };
  });
}

/**
 * Single owner of upstream session tracking. However many browsers are
 * watching, each media server has one live connection (or, failing that, one
 * polling loop) here, and every change is pushed to all subscribers. Upstream
 * work starts with the first subscriber and stops a while after the last one
 * leaves.
 */
class SessionHub {
  private listeners = new Set<Listener>();
  private sources = new Map<SessionSource, SourceState>();
  private running = false;
  // Bumped on stop so fetches from a previous run are ignored
  private generation = 0;
  private shutdownTimer?: ReturnType<typeof setTimeout>;
  private broadcastTimer?: ReturnType<typeof setTimeout>;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    clearTimeout(this.shutdownTimer);

    if (!this.running) this.start();
    else if (this.isReady()) listener(this.snapshot());

    return () => {
      if (!this.listeners.delete(listener) || this.listeners.size > 0) return;
      clearTimeout(this.shutdownTimer);
      this.shutdownTimer = setTimeout(() => this.stop(), IDLE_SHUTDOWN_MS);
    };
  }

  /** Fetches every polled source now, unless one just did. Live feeds are already current. */
  refresh(): void {
    if (!this.running) return;
    const now = Date.now();
    for (const [source, state] of this.sources) {
      if (!state.live && !state.fetching && now - state.lastFetch > REFRESH_MIN_GAP_MS) {
        this.poll(source, this.generation);
      }
    }
  }

  private start(): void {
    this.running = true;
    this.sources.clear();
    const generation = this.generation;

    for (const source of configuredSources()) {
      const state: SourceState = {
        data: null,
        observedAt: 0,
        error: null,
        settled: false,
        fetching: false,
        lastFetch: 0,
        failures: 0,
        live: false,
      };
      this.sources.set(source, state);

      const feed = FEEDS[source];
      // Node < 22 has no built-in WebSocket; those servers just poll
      if (!feed || typeof WebSocket === "undefined") {
        this.poll(source, generation);
        continue;
      }

      try {
        state.stopFeed = feed({
          onSessions: (data) => this.onFeedSessions(source, data, generation),
          onDisconnect: () => this.onFeedDisconnect(source, generation),
        });
        state.timer = setTimeout(() => this.poll(source, generation), FEED_CONNECT_GRACE_MS);
      } catch (err) {
        console.error(`Could not start ${source} feed; polling instead:`, err);
        this.poll(source, generation);
      }
    }
    // Nothing configured: viewers get an empty snapshot rather than waiting forever
    if (this.sources.size === 0) this.scheduleBroadcast();
  }

  private stop(): void {
    this.running = false;
    this.generation++;
    clearTimeout(this.broadcastTimer);
    this.broadcastTimer = undefined;
    for (const state of this.sources.values()) {
      clearTimeout(state.timer);
      state.stopFeed?.();
    }
    // Drop data too: offsets can't be projected across a gap with no fetches
    this.sources.clear();
  }

  private onFeedSessions(source: SessionSource, data: SessionsResponse, generation: number): void {
    const state = this.sources.get(source);
    if (!state || generation !== this.generation) return;
    if (!state.live) console.info(`${source} sessions: live`);
    state.live = true;
    clearTimeout(state.timer);
    this.settle(state, this.ingest(state, data));
  }

  private onFeedDisconnect(source: SessionSource, generation: number): void {
    const state = this.sources.get(source);
    if (!state || generation !== this.generation || !state.live) return;
    console.warn(`${source} sessions: feed lost, polling until it reconnects`);
    state.live = false;
    if (!state.fetching) this.poll(source, generation);
  }

  // Returns whether viewers need to hear about it
  private ingest(state: SourceState, data: SessionsResponse): boolean {
    let changed = state.error !== null;
    const observedAt = Date.now();
    if (!state.data || isMeaningfulChange(state.data, state.observedAt, data, observedAt)) {
      state.data = data;
      state.observedAt = observedAt;
      changed = true;
    }
    state.error = null;
    state.failures = 0;
    return changed;
  }

  private settle(state: SourceState, changed: boolean): void {
    if (!state.settled) {
      state.settled = true;
      changed = true;
    }
    if (changed) this.scheduleBroadcast();
  }

  private async poll(source: SessionSource, generation: number): Promise<void> {
    const state = this.sources.get(source);
    if (!state || state.live) return;
    clearTimeout(state.timer);
    state.fetching = true;

    let changed = false;
    try {
      const data = await SESSION_FETCHERS[source]();
      // The feed took over mid-fetch and is at least as fresh
      if (generation !== this.generation || state.live) return;
      changed = this.ingest(state, data);
    } catch (err) {
      if (generation !== this.generation || state.live) return;

      console.error(`Error fetching ${source} sessions:`, err);
      // A failed source contributes nothing rather than going stale
      changed = state.data !== null || state.error === null;
      state.data = null;
      state.error = err instanceof Error ? err : new Error(String(err));
      state.failures++;
    } finally {
      if (generation === this.generation) {
        state.fetching = false;
        state.lastFetch = Date.now();
      }
    }

    this.settle(state, changed);

    const delay = state.error
      ? retryDelay(state.failures)
      : hasPlaying(state.data)
        ? POLL_PLAYING_MS
        : POLL_IDLE_MS;
    state.timer = setTimeout(() => this.poll(source, generation), delay);
  }

  private isReady(): boolean {
    for (const state of this.sources.values()) {
      if (!state.settled) return false;
    }
    return true;
  }

  private scheduleBroadcast(): void {
    if (this.broadcastTimer || !this.isReady()) return;
    this.broadcastTimer = setTimeout(() => {
      this.broadcastTimer = undefined;
      if (!this.running || !this.isReady()) return;
      const message = this.snapshot();
      for (const listener of this.listeners) listener(message);
    }, BROADCAST_DELAY_MS);
  }

  private snapshot(): SessionStreamMessage {
    const now = Date.now();
    const sessions: SessionsResponse = { tracks: [], movies: [], episodes: [] };
    // Labels only: upstream error text can include server URLs and tokens
    const failed: string[] = [];

    for (const [source, state] of this.sources) {
      if (state.error) failed.push(SOURCE_LABELS[source]);
      if (!state.data) continue;
      const elapsed = now - state.observedAt;
      sessions.tracks.push(...advance(state.data.tracks, elapsed));
      sessions.movies.push(...advance(state.data.movies, elapsed));
      sessions.episodes.push(...advance(state.data.episodes, elapsed));
    }

    const allFailed = this.sources.size > 0 && failed.length === this.sources.size;
    return allFailed
      ? { sessions, error: `Unable to reach ${failed.join(" or ")}. Retrying…` }
      : { sessions };
  }
}

// One hub per server process, surviving dev hot reloads and duplicated module
// instances so there's never more than one upstream loop per media server
const globalForHub = globalThis as typeof globalThis & { __sessionHub?: SessionHub };

export const sessionHub = (globalForHub.__sessionHub ??= new SessionHub());
