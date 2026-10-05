import { useState, useEffect, useCallback, useRef } from "react";
import type { MouseEvent } from "react";

// A hover/unhover pair under a still cursor cycles well inside this; a longer
// gap means the loop has settled or the cursor has left
const MAX_TOGGLE_GAP_MS = 1_000;
// How long the loop must run before it counts as stuck
const STUCK_AFTER_MS = 5_000;
// Movement beyond this ends the streak; synthetic events from layout shifts
// repeat the same coordinates, so they never trip it
const MOVE_TOLERANCE_PX = 4;

interface Streak {
  startedAt: number;
  x: number;
  y: number;
}

// Detects an element whose hover state keeps flipping while the cursor sits
// still, e.g. when expanding moves its edge out from under the pointer
export function useHoverLoopDetector() {
  const [stuck, setStuck] = useState(false);
  const streakRef = useRef<Streak | null>(null);
  const lastToggleRef = useRef(0);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    streakRef.current = null;
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = null;
    setStuck(false);
  }, []);

  const onToggle = useCallback(
    (e: MouseEvent) => {
      const now = performance.now();
      const streak = streakRef.current;
      if (!streak || now - lastToggleRef.current > MAX_TOGGLE_GAP_MS) {
        streakRef.current = { startedAt: now, x: e.clientX, y: e.clientY };
      } else if (now - streak.startedAt >= STUCK_AFTER_MS) {
        setStuck(true);
      }
      lastToggleRef.current = now;

      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = setTimeout(reset, MAX_TOGGLE_GAP_MS);
    },
    [reset]
  );

  useEffect(() => {
    const handleMove = (e: globalThis.MouseEvent) => {
      const streak = streakRef.current;
      if (!streak) return;
      if (Math.hypot(e.clientX - streak.x, e.clientY - streak.y) > MOVE_TOLERANCE_PX) {
        reset();
      }
    };
    const handleVisibility = () => {
      if (document.hidden) reset();
    };
    window.addEventListener("mousemove", handleMove);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    };
  }, [reset]);

  return { stuck, onToggle };
}
