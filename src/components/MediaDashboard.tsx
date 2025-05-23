"use client";

import React, { useEffect, useState, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useMediaDataContext } from "./MediaDataContext";

interface MediaDashboardProps {
  children: React.ReactNode;
}

const MediaDashboard = memo(({ children }: MediaDashboardProps) => {
  const { mediaData, loading, error, lastSyncTime, isConnected, refreshData } =
    useMediaDataContext();

  const syncTextRef = useRef<HTMLSpanElement>(null);
  const [showLoading, setShowLoading] = useState(loading && !mediaData);
  const [, setHeaderHeight] = useState<number>(0);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSyncText = () => {
      if (!syncTextRef.current) return;

      const timeSinceSync = Math.floor(
        (Date.now() - lastSyncTime.getTime()) / 1000
      );
      const syncText =
        timeSinceSync < 60
          ? `${timeSinceSync}s ago`
          : `${Math.floor(timeSinceSync / 60)}m ago`;

      syncTextRef.current.textContent = `Synced ${syncText}`;
    };

    updateSyncText();
    const timer = setInterval(updateSyncText, 5000);

    return () => clearInterval(timer);
  }, [lastSyncTime]);

  const counts = useMemo(() => {
    const musicCount = mediaData?.tracks?.length || 0;
    const moviesCount = mediaData?.movies?.length || 0;
    const tvShowsCount = mediaData?.episodes?.length || 0;
    const totalCount = musicCount + moviesCount + tvShowsCount;

    return { musicCount, moviesCount, tvShowsCount, totalCount };
  }, [mediaData]);

  useEffect(() => {
    if (loading && !mediaData) {
      setShowLoading(true);
    } else if (!loading && mediaData) {
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, mediaData]);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }

    const handleResize = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const headerContent = useMemo(
    () => (
      <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between items-center">
        <div className="flex flex-col mb-3 md:mb-0 items-center md:items-start text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start">
            <div className="text-3xl sm:text-4xl font-bold">Now Playing</div>
            <div className="flex items-center ml-2">
              <span className="text-2xl">🎶</span>
              <span className="text-2xl ml-1">🎬</span>
              <span className="text-2xl ml-1">📺</span>
            </div>
          </div>
          <div className="text-gray-400 text-sm mt-1 flex items-center gap-3">
            <span>
              {counts.totalCount} active session
              {counts.totalCount !== 1 ? "s" : ""}
            </span>
            <span className="text-gray-600">•</span>
            <span className="flex items-center gap-1">
              {isConnected ? (
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              ) : (
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              )}
              <span ref={syncTextRef}>Synced 0s ago</span>
            </span>
            <button
              onClick={refreshData}
              className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
        <a
          href="https://www.plex.tv"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center hover:opacity-80 transition-opacity duration-200 cursor-pointer"
        >
          <span className="text-gray-400 mr-2 text-sm">Powered by</span>
          <Image
            src="/images/plex.png"
            alt="Plex"
            width={70}
            height={28}
            className="inline-block"
            priority
          />
        </a>
      </div>
    ),
    [counts.totalCount, isConnected, refreshData]
  );

  return (
    <>
      <AnimatePresence>
        {showLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-[#141414] z-50 flex items-center justify-center"
          >
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-t-2 border-b-2 border-orange-500 rounded-full animate-spin"></div>
                </div>
              </div>

              <div className="mt-6 flex flex-col items-center">
                <h2 className="text-xl font-bold">Loading media data</h2>
                <p className="text-gray-400 mt-2">
                  Fetching the latest streams...
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 flex flex-col bg-animated-gradient text-white overflow-hidden">
        <header
          ref={headerRef}
          className="flex-shrink-0 z-20 bg-[#141414]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2 border-b border-gray-800/30 shadow-lg"
        >
          {headerContent}
        </header>

        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>

      {error && !isConnected && (
        <div className="fixed bottom-4 right-4 bg-red-900/80 text-white p-4 rounded-lg shadow-lg max-w-md backdrop-blur-sm">
          <h3 className="font-bold mb-1">Connection Error</h3>
          <p className="text-sm mb-2">{error.message}</p>
          <p className="text-xs text-gray-300 mb-2">
            Retrying automatically...
          </p>
          <button
            onClick={refreshData}
            className="text-xs bg-red-700 hover:bg-red-600 px-3 py-1 rounded transition-colors"
          >
            Retry Now
          </button>
        </div>
      )}
    </>
  );
});

MediaDashboard.displayName = "MediaDashboard";

export default MediaDashboard;
