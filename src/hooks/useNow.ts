import { useSyncExternalStore } from "react";

interface Clock {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
}

const clocks = new Map<number, Clock>();

// One shared timer per interval; it only runs while subscribed and the tab is visible
function getClock(intervalMs: number): Clock {
  const existing = clocks.get(intervalMs);
  if (existing) return existing;

  const listeners = new Set<() => void>();
  let now = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = () => {
    now = Date.now();
    listeners.forEach((listener) => listener());
  };

  const start = () => {
    if (timer === null && !document.hidden) {
      timer = setInterval(tick, intervalMs);
    }
  };

  const stop = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      stop();
    } else {
      tick();
      start();
    }
  };

  const clock: Clock = {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        now = Date.now();
        start();
        document.addEventListener("visibilitychange", onVisibilityChange);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stop();
          document.removeEventListener("visibilitychange", onVisibilityChange);
        }
      };
    },
    getSnapshot: () => now,
  };

  clocks.set(intervalMs, clock);
  return clock;
}

const noopSubscribe = () => () => {};
const getZero = () => 0;

/**
 * Current time in ms, re-rendering the caller every `intervalMs`.
 * Pass `null` to opt out of ticking (returns 0). Returns 0 during SSR.
 */
export function useNow(intervalMs: number | null): number {
  const clock = intervalMs === null ? null : getClock(intervalMs);
  return useSyncExternalStore(
    clock ? clock.subscribe : noopSubscribe,
    clock ? clock.getSnapshot : getZero,
    getZero
  );
}
