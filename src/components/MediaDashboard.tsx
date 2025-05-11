"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaData } from "../hooks/useMediaData";
import NavigationTabs from "./NavigationTabs";

interface MediaDashboardProps {
  children: React.ReactNode;
  pollingInterval?: number;
}

export default function MediaDashboard({
  children,
  pollingInterval = 5000,
}: MediaDashboardProps) {
  const { mediaData, loading, error, lastUpdated, refreshData } =
    useMediaData(pollingInterval);

  const [formattedTime, setFormattedTime] = useState<string>("Loading...");

  useEffect(() => {
    setFormattedTime(lastUpdated.toLocaleTimeString());

    const intervalId = setInterval(() => {
      setFormattedTime(new Date().toLocaleTimeString());
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [lastUpdated, pollingInterval]);

  const [showLoading, setShowLoading] = React.useState(loading && !mediaData);

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

  const musicCount = mediaData?.tracks?.length || 0;
  const moviesCount = mediaData?.movies?.length || 0;
  const tvShowsCount = mediaData?.episodes?.length || 0;
  const totalCount = musicCount + moviesCount + tvShowsCount;

  const navItems = [
    { href: "/music", label: "Music", count: musicCount },
    { href: "/movies", label: "Movies", count: moviesCount },
    { href: "/tvshows", label: "TV Shows", count: tvShowsCount },
  ];

  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const headerRef = React.useRef<HTMLDivElement>(null);

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

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [mediaData]);

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
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-r-2 border-l-2 border-orange-300 rounded-full animate-ping opacity-75"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
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

      <motion.header
        ref={headerRef}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-20 bg-[#141414]/95 backdrop-blur-md px-8 pt-8 pb-1 border-b border-gray-800/30 shadow-lg" // Reduced bottom padding (pb-1)
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-4">
          {" "}
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-4xl font-bold"
            >
              Now Playing 💃 🎬 📺
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-gray-400 text-sm mt-1"
            >
              Last updated: {formattedTime} • {totalCount} active session
              {totalCount !== 1 ? "s" : ""}
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <NavigationTabs items={navItems} />
          </motion.div>
        </div>
      </motion.header>

      <div
        className="min-h-screen bg-animated-gradient text-white overflow-x-hidden"
        style={{ paddingTop: `${headerHeight}px` }}
      >
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="p-8 pt-4 pb-16"
        >
          {children}
        </motion.main>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-4 right-4 bg-red-900/80 text-white p-4 rounded-lg shadow-lg max-w-md backdrop-blur-sm"
          >
            <h3 className="font-bold mb-1">Error refreshing data</h3>
            <p className="text-sm mb-2">{error.message}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={refreshData}
              className="text-xs bg-red-700 hover:bg-red-600 px-3 py-1 rounded transition-colors"
            >
              Retry Now
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
