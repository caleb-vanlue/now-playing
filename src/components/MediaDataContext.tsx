"use client";

import React, { createContext, useContext, ReactNode, useMemo, useEffect } from "react";
import { useMediaData, MediaStatus } from "../hooks/useMediaData";
import { MediaData } from "../../types/media";
import { prefetchLyrics } from "../hooks/useLyrics";

interface MediaStatusContextValue extends MediaStatus {
  refreshData: () => void;
}

// Split so status-only updates don't re-render session consumers,
// and unchanged session data (same reference) doesn't re-render anything.
const MediaSessionsContext = createContext<MediaData | null | undefined>(undefined);
const MediaStatusContext = createContext<MediaStatusContextValue | undefined>(undefined);

interface MediaDataProviderProps {
  children: ReactNode;
  // Sessions are pushed live; these only apply when falling back to polling
  activePollingInterval?: number;
  pausedPollingInterval?: number;
  idlePollingInterval?: number;
}

export function MediaDataProvider({
  children,
  activePollingInterval = 30000, // 30 seconds when playing
  pausedPollingInterval = 120000, // 2 minutes when paused
  idlePollingInterval = 300000, // 5 minutes when idle
}: MediaDataProviderProps) {
  const { mediaData, status, refreshData } = useMediaData({
    active: activePollingInterval,
    paused: pausedPollingInterval,
    idle: idlePollingInterval,
  });

  const tracks = mediaData?.tracks;
  useEffect(() => {
    tracks?.forEach(prefetchLyrics);
  }, [tracks]);

  const statusValue = useMemo(() => ({ ...status, refreshData }), [status, refreshData]);

  return (
    <MediaStatusContext.Provider value={statusValue}>
      <MediaSessionsContext.Provider value={mediaData}>
        {children}
      </MediaSessionsContext.Provider>
    </MediaStatusContext.Provider>
  );
}

export function useMediaSessions(): MediaData | null {
  const context = useContext(MediaSessionsContext);
  if (context === undefined) {
    throw new Error("useMediaSessions must be used within a MediaDataProvider");
  }
  return context;
}

export function useMediaStatus(): MediaStatusContextValue {
  const context = useContext(MediaStatusContext);
  if (context === undefined) {
    throw new Error("useMediaStatus must be used within a MediaDataProvider");
  }
  return context;
}
