import { BaseMedia } from "../../types/media";
import { useNow } from "./useNow";

export type ProgressSource = Pick<BaseMedia, "state" | "viewOffset" | "duration" | "syncedAt">;

/**
 * Playback position interpolated forward from the last server sync while playing.
 * Only the calling component re-renders each second, not the whole tree.
 */
export function useLiveViewOffset(item: ProgressSource): number {
  const playing = item.state === "playing";
  const now = useNow(playing ? 1000 : null);
  const base = item.viewOffset ?? 0;

  if (!playing || now === 0) return base;

  const live = base + Math.max(0, now - item.syncedAt);
  return item.duration ? Math.min(live, item.duration) : live;
}
