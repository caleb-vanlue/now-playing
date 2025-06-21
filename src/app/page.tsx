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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tracks.map((track, index) => (
              <MusicCard key={track.id} track={track} index={index} />
            ))}
          </div>
        );

      case "movies":
        if (movies.length === 0) {
          return <EmptyState type="movies" />;
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {movies.map((movie, index) => (
              <MovieCard key={movie.id} item={movie} index={index} />
            ))}
          </div>
        );

      case "tvshows":
        if (episodes.length === 0) {
          return <EmptyState type="tvshows" />;
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {episodes.map((episode, index) => (
              <TVShowCard key={episode.id} item={episode} index={index} />
            ))}
          </div>
        );

      case "history":
        return <HistoryTable items={history} loading={historyLoading} />;
    }
  }, [activeTab, tracks, movies, episodes, history, historyLoading]);

  return (
    <MediaDashboard>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pb-2">
          <NavigationTabs
            items={navItems}
            onTabClick={handleTabClick}
            activeTab={`#${activeTab}`}
          />
        </div>
        <div
          className="flex-1 h-full overflow-y-auto px-4 sm:px-6 lg:px-8 pb-16"
          {...swipeHandlers}
        >
          <PageTransition key={activeTab}>{renderContent}</PageTransition>
        </div>
      </div>
      <a
        href="https://github.com/caleb-vanlue/now-playing"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 hover:opacity-80 transition-opacity"
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
