"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useMediaData } from "../hooks/useMediaData";
import { MediaData } from "../../types/media";
import { spotifyCache } from "../../utils/spotifyCache";
import { searchSpotifyTrack } from "../../utils/spotifyApi";

interface MediaDataContextValue {
  mediaData: MediaData | null;
  loading: boolean;
  error: Error | null;
  lastSyncTime: Date;
  isConnected: boolean;
  refreshData: () => void;
  getSpotifyUrl: (artist: string, trackTitle: string) => Promise<string | null>;
}

const MediaDataContext = createContext<MediaDataContextValue | undefined>(
  undefined
);

interface MediaDataProviderProps {
  children: ReactNode;
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
  const mediaDataState = useMediaData({
    activePollingInterval,
    pausedPollingInterval,
    idlePollingInterval,
  });

  const getSpotifyUrl = async (
    artist: string,
    trackTitle: string
  ): Promise<string | null> => {
    if (!artist || !trackTitle) return null;

    const cachedUrl = spotifyCache.getUrl(artist, trackTitle);
    if (cachedUrl !== null) {
      return cachedUrl;
    }

    try {
      const result = await searchSpotifyTrack(artist, trackTitle);

      if (result.found && result.spotifyUrl) {
        spotifyCache.setUrl(artist, trackTitle, result.spotifyUrl);
        return result.spotifyUrl;
      } else {
        spotifyCache.setUrl(artist, trackTitle, "");
        return null;
      }
    } catch (error) {
      console.error("Error fetching Spotify URL:", error);
      return null;
    }
  };

  return (
    <MediaDataContext.Provider
      value={{
        ...mediaDataState,
        getSpotifyUrl,
      }}
    >
      {children}
    </MediaDataContext.Provider>
  );
}

export function useMediaDataContext(): MediaDataContextValue {
  const context = useContext(MediaDataContext);

  if (context === undefined) {
    throw new Error(
      "useMediaDataContext must be used within a MediaDataProvider"
    );
  }

  return context;
}
