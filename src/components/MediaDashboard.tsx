"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SiPlex, SiJellyfin } from "react-icons/si";
import { useMediaSessions, useMediaStatus } from "./MediaDataContext";
import { useTheme } from "../contexts/ThemeContext";
import { useCollapsingHeader } from "../hooks/useCollapsingHeader";

interface MediaDashboardProps {
  // Rendered in the fixed header, below the title bar
  nav?: React.ReactNode;
  children: React.ReactNode;
}

export default function MediaDashboard({ nav, children }: MediaDashboardProps) {
  const mediaData = useMediaSessions();
  const { loading, error, isConnected, live, refreshData } = useMediaStatus();
  const { theme, setTheme } = useTheme();
  const { headerRef, collapsed, headerHeight } = useCollapsingHeader();

  // Only the very first load blocks the UI; on failure the overlay yields to the error toast
  const showLoading = loading && !mediaData;

  // Merged cards hold several sessions; count every stream, not every card
  const totalCount = useMemo(
    () =>
      [...(mediaData?.tracks ?? []), ...(mediaData?.movies ?? []), ...(mediaData?.episodes ?? [])]
        .reduce((sum, item) => sum + (item.streams?.length ?? 1), 0),
    [mediaData]
  );

  const statusDotColor = !isConnected ? "bg-red-500" : live ? "bg-green-500" : "bg-yellow-500";

  const headerContent = useMemo(
    () => (
      <div className="w-full flex items-center justify-between gap-3">
        <button
          className="flex flex-col min-w-0 items-start text-left focus:outline-none"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
        >
          <div className="flex items-center">
            <div
              className={`font-bold whitespace-nowrap motion-safe:transition-[font-size] motion-safe:duration-200 ${
                collapsed ? "text-lg sm:text-xl" : "text-2xl sm:text-4xl"
              }`}
            >
              Now Playing
            </div>
            <div className={`${collapsed ? "hidden" : "hidden sm:flex"} items-center ml-2`}>
              <span className="text-2xl">🎶</span>
              <span className="text-2xl ml-1">🎬</span>
              <span className="text-2xl ml-1">📺</span>
            </div>
            {/* The status line folds away when collapsed; its dot stays beside the title */}
            <span
              className={`w-2 h-2 ml-2 rounded-full flex-shrink-0 motion-safe:transition-opacity ${statusDotColor} ${
                collapsed ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden="true"
            ></span>
          </div>
          <div
            className={`grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-200 ${
              collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
            }`}
          >
            <div className="overflow-hidden">
              <div className="text-gray-400 text-xs sm:text-sm sm:mt-1 flex items-center gap-2 whitespace-nowrap">
                <span
                  aria-live="polite"
                  aria-atomic="true"
                  title={
                    isConnected && !live
                      ? "Live updates unavailable; refreshing periodically"
                      : undefined
                  }
                >
                  {!isConnected ? "Disconnected" : live ? "Live" : "Connected"}
                </span>
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotColor}`}
                  aria-hidden="true"
                ></span>
                <span>
                  {totalCount} active session
                  {totalCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </button>
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <button
            onClick={() => setTheme("plex")}
            aria-label="Switch to Plex theme"
            aria-pressed={theme === "plex"}
            className={`transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded ${
              theme === "plex"
                ? "text-[#e5a00d]"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <SiPlex className={collapsed ? "w-6 h-6" : "w-7 h-7 sm:w-8 sm:h-8"} />
          </button>
          <span className="text-gray-700 text-sm">|</span>
          <button
            onClick={() => setTheme("jellyfin")}
            aria-label="Switch to Jellyfin theme"
            aria-pressed={theme === "jellyfin"}
            className={`transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded ${
              theme === "jellyfin"
                ? "text-[#00a4dc]"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <SiJellyfin className={collapsed ? "w-5 h-5" : "w-[22px] h-[22px] sm:w-[26px] sm:h-[26px]"} />
          </button>
        </div>
      </div>
    ),
    [totalCount, isConnected, live, statusDotColor, collapsed, theme, setTheme],
  );

  return (
    <>
      <AnimatePresence>
        {showLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 theme-bg z-50 flex items-center justify-center"
          >
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-12 h-12 border-t-2 border-b-2 border-[var(--accent)] rounded-full animate-spin"
                    role="status"
                    aria-label="Loading"
                  ></div>
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

      <div className="fixed inset-0 -z-10 bg-animated-gradient" aria-hidden="true"></div>

      {/* The page itself scrolls so mobile browsers can collapse their toolbars */}
      <div className="min-h-dvh flex flex-col text-white safe-area-x">
        <div ref={headerRef} className="fixed top-0 inset-x-0 z-20 shadow-lg">
          <header className="theme-bg-header backdrop-blur-md border-b border-gray-800/30 safe-area-x pt-[env(safe-area-inset-top)]">
            <div
              className={`px-4 sm:px-6 lg:px-8 motion-safe:transition-[padding] motion-safe:duration-200 ${
                collapsed ? "py-1.5" : "pt-3 sm:pt-6 pb-2"
              }`}
            >
              {headerContent}
            </div>
          </header>
          {nav && (
            <div className="theme-bg-nav backdrop-blur-sm safe-area-x">
              <div className="px-4 sm:px-6 lg:px-8">{nav}</div>
            </div>
          )}
        </div>

        <main className="flex-1 flex flex-col" style={{ paddingTop: headerHeight }}>
          {children}
        </main>
      </div>

      {error && !isConnected && (
        <div
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] bg-red-900/80 text-white p-4 rounded-lg shadow-lg max-w-md backdrop-blur-sm"
          role="alert"
          aria-live="assertive"
        >
          <h3 className="font-bold mb-1">Connection Error</h3>
          <p className="text-sm mb-2">{error.message}</p>
          <p className="text-xs text-gray-300 mb-2">
            Retrying automatically...
          </p>
          <button
            onClick={refreshData}
            aria-label="Retry connection"
            className="text-xs bg-red-700 hover:bg-red-600 px-3 py-1 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-red-900"
          >
            Retry Now
          </button>
        </div>
      )}
    </>
  );
}
