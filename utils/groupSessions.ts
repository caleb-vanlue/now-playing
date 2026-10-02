import type { BaseMedia, MediaData, Stream } from "../types/media";

interface SyncWindow {
  // Streams this close together join a card
  merge: number;
  // Already-merged streams stay together until they drift past this
  split: number;
}

const VIDEO_WINDOW: SyncWindow = { merge: 3 * 60_000, split: 3.5 * 60_000 };
const TRACK_WINDOW: SyncWindow = { merge: 60_000, split: 75_000 };

interface Group<T extends BaseMedia> {
  members: T[];
  merged: T;
}

function liveOffset(item: BaseMedia, now: number): number {
  const base = item.viewOffset ?? 0;
  return item.state === "playing" ? base + Math.max(0, now - item.syncedAt) : base;
}

function toStream(item: BaseMedia): Stream {
  return {
    sessionId: item.sessionId,
    userId: item.userId,
    userAvatar: item.userAvatar,
    player: item.player,
    state: item.state,
    viewOffset: item.viewOffset,
    syncedAt: item.syncedAt,
    videoDecision: item.videoDecision,
    audioDecision: item.audioDecision,
    transcodeHwRequested: item.transcodeHwRequested,
  };
}

// Input is sorted by startTime, so a cluster's first member in list order is its primary
function clusterByOffset<T extends BaseMedia>(
  items: T[],
  window: SyncWindow,
  now: number,
  wasTogether: (a: T, b: T) => boolean
): T[][] {
  const order = new Map(items.map((item, i) => [item, i]));
  const byOffset = [...items].sort((a, b) => liveOffset(a, now) - liveOffset(b, now));

  const clusters: T[][] = [];
  for (const item of byOffset) {
    const current = clusters[clusters.length - 1];
    // Compare against the cluster's first member so a chain of small gaps can't
    // pull far-apart streams into one card
    const anchor = current?.[0];
    const gap = anchor ? liveOffset(item, now) - liveOffset(anchor, now) : Infinity;
    const limit = anchor && wasTogether(anchor, item) ? window.split : window.merge;
    if (current && gap <= limit) current.push(item);
    else clusters.push([item]);
  }

  return clusters.map((c) => c.sort((a, b) => order.get(a)! - order.get(b)!));
}

function createListGrouper<T extends BaseMedia>(window: SyncWindow) {
  let prevInput: T[] | null = null;
  let prevOutput: T[] = [];
  // Keyed by the primary's sessionId
  let prevGroups = new Map<string, Group<T>>();
  // sessionId -> primary sessionId from the last pass
  let prevPrimaryOf = new Map<string, string>();

  return (items: T[]): T[] => {
    if (items === prevInput) return prevOutput;

    const now = Date.now();
    const buckets = new Map<string, T[]>();
    for (const item of items) {
      const key = `${item.source}:${item.id}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(item);
      else buckets.set(key, [item]);
    }

    const wasTogether = (a: T, b: T) => {
      const pa = prevPrimaryOf.get(a.sessionId);
      return pa !== undefined && pa === prevPrimaryOf.get(b.sessionId);
    };

    const groups = new Map<string, Group<T>>();
    const primaryOf = new Map<string, string>();
    for (const bucket of buckets.values()) {
      if (bucket.length === 1) continue;
      for (const members of clusterByOffset(bucket, window, now, wasTogether)) {
        if (members.length === 1) continue;
        const primary = members[0];
        const prev = prevGroups.get(primary.sessionId);
        const unchanged =
          prev &&
          prev.members.length === members.length &&
          prev.members.every((m, i) => m === members[i]);
        const merged = unchanged ? prev.merged : { ...primary, streams: members.map(toStream) };
        groups.set(primary.sessionId, { members, merged });
        members.forEach((m) => primaryOf.set(m.sessionId, primary.sessionId));
      }
    }

    const output: T[] = [];
    for (const item of items) {
      const primaryId = primaryOf.get(item.sessionId);
      if (primaryId === undefined) output.push(item);
      else if (primaryId === item.sessionId) output.push(groups.get(primaryId)!.merged);
    }

    prevInput = items;
    prevGroups = groups;
    prevPrimaryOf = primaryOf;
    const unchanged =
      output.length === prevOutput.length && output.every((item, i) => item === prevOutput[i]);
    if (!unchanged) prevOutput = output;
    return prevOutput;
  };
}

/**
 * Returns a stateful grouper that collapses sessions playing the same item on
 * the same server within a few minutes of each other into one card. It keeps
 * object identity for unchanged lists and groups, and applies hysteresis so
 * streams hovering near the window edge don't flicker between one card and two.
 */
export function createSessionGrouper(): (data: MediaData) => MediaData {
  const groupTracks = createListGrouper<MediaData["tracks"][number]>(TRACK_WINDOW);
  const groupMovies = createListGrouper<MediaData["movies"][number]>(VIDEO_WINDOW);
  const groupEpisodes = createListGrouper<MediaData["episodes"][number]>(VIDEO_WINDOW);
  let prevInput: MediaData | null = null;
  let prevOutput: MediaData | null = null;

  return (data) => {
    if (data === prevInput && prevOutput) return prevOutput;

    const tracks = groupTracks(data.tracks);
    const movies = groupMovies(data.movies);
    const episodes = groupEpisodes(data.episodes);

    prevInput = data;
    if (
      !prevOutput ||
      tracks !== prevOutput.tracks ||
      movies !== prevOutput.movies ||
      episodes !== prevOutput.episodes
    ) {
      prevOutput = { tracks, movies, episodes };
    }
    return prevOutput;
  };
}
