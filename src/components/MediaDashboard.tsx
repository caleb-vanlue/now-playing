"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMediaData } from "../hooks/useMediaData";

interface MediaDashboardProps {
  children: React.ReactNode;
  pollingInterval?: number;
}

export default function MediaDashboard({
  children,
  pollingInterval = 5000,
}: MediaDashboardProps) {
  const pathname = usePathname();
  const { mediaData, loading, error, lastUpdated, refreshData } =
    useMediaData(pollingInterval);

  const formattedTime = lastUpdated.toLocaleTimeString();

  if (loading && !mediaData) {
    return (
      <div className="min-h-screen bg-[#141414] p-8 text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
          <h2 className="text-xl">Loading media data...</h2>
        </div>
      </div>
    );
  }

  const musicCount = mediaData?.tracks?.length || 0;
  const moviesCount = mediaData?.movies?.length || 0;
  const tvShowsCount = mediaData?.episodes?.length || 0;
  const totalCount = musicCount + moviesCount + tvShowsCount;

  return (
    <div className="min-h-screen bg-[#141414] p-8 text-white">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-12 gap-4">
        <div>
          <h1 className="text-4xl font-bold">NOW PLAYING</h1>
          <div className="text-gray-400 text-sm mt-1">
            Last updated: {formattedTime} • {totalCount} active session
            {totalCount !== 1 ? "s" : ""}
          </div>
        </div>
        <nav className="flex space-x-8">
          <Link
            href="/music"
            className={`relative pb-2 ${
              pathname === "/music"
                ? "text-white border-b-2 border-orange-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Music{" "}
            {musicCount > 0 && (
              <span className="ml-1 text-xs bg-orange-500 px-1.5 py-0.5 rounded-full">
                {musicCount}
              </span>
            )}
          </Link>
          <Link
            href="/movies"
            className={`relative pb-2 ${
              pathname === "/movies"
                ? "text-white border-b-2 border-orange-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Movies{" "}
            {moviesCount > 0 && (
              <span className="ml-1 text-xs bg-orange-500 px-1.5 py-0.5 rounded-full">
                {moviesCount}
              </span>
            )}
          </Link>
          <Link
            href="/tvshows"
            className={`relative pb-2 ${
              pathname === "/tvshows"
                ? "text-white border-b-2 border-orange-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            TV Shows{" "}
            {tvShowsCount > 0 && (
              <span className="ml-1 text-xs bg-orange-500 px-1.5 py-0.5 rounded-full">
                {tvShowsCount}
              </span>
            )}
          </Link>
        </nav>
      </header>

      <main>{children}</main>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-900/80 text-white p-4 rounded-lg shadow-lg max-w-md">
          <h3 className="font-bold mb-1">Error refreshing data</h3>
          <p className="text-sm mb-2">{error.message}</p>
          <button
            onClick={refreshData}
            className="text-xs bg-red-700 hover:bg-red-600 px-3 py-1 rounded transition-colors"
          >
            Retry Now
          </button>
        </div>
      )}
    </div>
  );
}
