import type { StatusSnapshot } from "../types/status";
import { monitor } from "./monitor";
import { sessionHub } from "./sessionHub";

export function buildStatusSnapshot(): StatusSnapshot {
  const memory = process.memoryUsage();
  return {
    now: Date.now(),
    process: {
      startedAt: monitor.startedAt,
      node: process.version,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
    },
    ...sessionHub.getStatus(),
    viewers: monitor.viewers(),
    stats: monitor.stats(),
    locations: monitor.locationStats(),
    visits: monitor.recentVisits(),
    events: monitor.recentEvents(),
  };
}
