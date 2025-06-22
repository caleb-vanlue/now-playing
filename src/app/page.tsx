"use client";

import React, { useState, useMemo, useCallback, memo } from "react";
import Image from "next/image";
import MediaDashboard from "../components/MediaDashboard";
import PageTransition from "../components/PageTransition";
import NavigationTabs from "../components/NavigationTabs";
import MusicCard from "../components/MusicCard";
import MovieCard from "../components/MovieCard";
import TVShowCard from "../components/TVShowCard";
import HistoryTable from "../components/HistoryTable";
import { useMediaDataContext } from "../components/MediaDataContext";
import { useHistory } from "../hooks/useHistory";
import { useSwipeable } from "react-swipeable";
import { useGridKeyboardNavigation } from "../hooks/useGridKeyboardNavigation";

type MediaType = "music" | "movies" | "tvshows" | "history";

const EmptyState = memo(({ type }: { type: MediaType }) => {
  const messages = {
    music: {
      title: "No music currently playing",
      subtitle: "Music will appear here when someone starts playing",
    },
    movies: {
      title: "No movies currently playing",
      subtitle: "Movies will appear here when someone starts playing",
    },
    tvshows: {
      title: "No TV shows currently playing",
      subtitle: "TV shows will appear here when someone starts playing",
    },
    history: {
      title: "No watch history found",
      subtitle: "Your viewing history will appear here",
    },
  };

  const message = messages[type];

  return (
    <div className="text-center text-gray-500 py-20">
      <p className="text-xl">{message.title}</p>
      <p className="mt-2">{message.subtitle}</p>
    </div>
  );
});

EmptyState.displayName = "EmptyState";

function MediaPage() {
  const { mediaData } = useMediaDataContext();
  const { history, loading: historyLoading } = useHistory({ limit: 100 });
  const [activeTab, setActiveTab] = useState<MediaType>("music");

  const order = useMemo(() => ["music", "movies", "tvshows", "history"], []);
  
  const handleSwipeLeft = useCallback(() => {
    setActiveTab(
      order[
        Math.min(order.indexOf(activeTab) + 1, order.length - 1)
      ] as MediaType
    );
  }, [activeTab, order]);

  const handleSwipeRight = useCallback(() => {
    setActiveTab(
      order[Math.max(order.indexOf(activeTab) - 1, 0)] as MediaType
    );
  }, [activeTab, order]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleSwipeLeft,
    onSwipedRight: handleSwipeRight,
    preventScrollOnSwipe: true,
  });

  const tracks = useMemo(() => mediaData?.tracks || [], [mediaData?.tracks]);
  const movies = useMemo(() => mediaData?.movies || [], [mediaData?.movies]);
  const episodes = useMemo(
    () => mediaData?.episodes || [],
    [mediaData?.episodes]
  );
  
  // Determine grid columns based on tab type
  const gridColumns = useMemo(() => {
    switch (activeTab) {
      case "music":
        return 4; // lg:grid-cols-4
      case "movies":
        return 5; // lg:grid-cols-5
      case "tvshows":
        return 4; // lg:grid-cols-4
      default:
        return 1;
    }
  }, [activeTab]);
  
  // Get current items count
  const currentItemsCount = useMemo(() => {
    switch (activeTab) {
      case "music":
        return tracks.length;
      case "movies":
        return movies.length;
      case "tvshows":
        return episodes.length;
      case "history":
        return history.length;
      default:
        return 0;
    }
  }, [activeTab, tracks.length, movies.length, episodes.length, history.length]);
  
  const { setItemRef, handleKeyDown } = useGridKeyboardNavigation({
    itemCount: currentItemsCount,
    columns: gridColumns,
    onItemSelect: () => {
      // This will be handled by the card's own click handler
    },
  });

  const navItems = useMemo(
    () => [
      { href: "#music", label: "Music", count: tracks.length },
      { href: "#movies", label: "Movies", count: movies.length },
      { href: "#tvshows", label: "TV Shows", count: episodes.length },
      { href: "#history", label: "History", count: 0 },
    ],
    [tracks.length, movies.length, episodes.length]
  );

  const handleTabClick = useCallback((href: string) => {
    const tab = href.substring(1) as MediaType;
    setActiveTab(tab);
  }, []);

  const renderContent = useMemo(() => {
    switch (activeTab) {
      case "music":
        if (tracks.length === 0) {
          return <EmptyState type="music" />;
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" role="group" aria-label="Music tracks">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                ref={setItemRef(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={index === 0 ? 0 : -1}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414] rounded-lg"
              >
                <MusicCard track={track} index={index} />
              </div>
            ))}
          </div>
        );

      case "movies":
        if (movies.length === 0) {
          return <EmptyState type="movies" />;
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" role="group" aria-label="Movies">
            {movies.map((movie, index) => (
              <div
                key={movie.id}
                ref={setItemRef(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={index === 0 ? 0 : -1}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414] rounded-lg"
              >
                <MovieCard item={movie} index={index} />
              </div>
            ))}
          </div>
        );

      case "tvshows":
        if (episodes.length === 0) {
          return <EmptyState type="tvshows" />;
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" role="group" aria-label="TV Shows">
            {episodes.map((episode, index) => (
              <div
                key={episode.id}
                ref={setItemRef(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={index === 0 ? 0 : -1}
                className="focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#141414] rounded-lg"
              >
                <TVShowCard item={episode} index={index} />
              </div>
            ))}
          </div>
        );

      case "history":
        return <HistoryTable items={history} loading={historyLoading} />;
    }
  }, [activeTab, tracks, movies, episodes, history, historyLoading, setItemRef, handleKeyDown]);

  return (
    <MediaDashboard>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-orange-500 text-white px-4 py-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">
        Skip to main content
      </a>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pb-2">
          <NavigationTabs
            items={navItems}
            onTabClick={handleTabClick}
            activeTab={`#${activeTab}`}
          />
        </div>
        <div
          id="main-content"
          className="flex-1 h-full overflow-y-auto px-4 sm:px-6 lg:px-8 pb-16"
          {...swipeHandlers}
          role="tabpanel"
          aria-labelledby={`#${activeTab}`}
          tabIndex={0}
        >
          <PageTransition key={activeTab}>{renderContent}</PageTransition>
        </div>
      </div>
      <a
        href="https://github.com/caleb-vanlue/now-playing"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View project on GitHub"
        className="fixed bottom-6 right-6 z-50 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#141414] rounded"
      >
        <Image
          src="/images/logos/github-mark-white.svg"
          alt="GitHub"
          width={48}
          height={48}
          className="w-12 h-12"
          priority={false}
        />
      </a>
    </MediaDashboard>
  );
}

export default memo(MediaPage);
