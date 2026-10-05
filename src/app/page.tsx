"use client";

import React, { useState, useMemo, useCallback, memo } from "react";
import MediaDashboard from "../components/MediaDashboard";
import PageTransition from "../components/PageTransition";
import NavigationTabs from "../components/NavigationTabs";
import ServiceLinksMenu from "../components/ServiceLinksMenu";
import MusicCard from "../components/MusicCard";
import MovieCard from "../components/MovieCard";
import TVShowCard from "../components/TVShowCard";
import HistoryTable from "../components/HistoryTable";
import { MediaDataProvider, useMediaSessions } from "../components/MediaDataContext";
import { useHistory } from "../hooks/useHistory";
import { useSwipeable } from "react-swipeable";
import { useGridKeyboardNavigation } from "../hooks/useGridKeyboardNavigation";

type MediaType = "all" | "music" | "movies" | "tvshows" | "history";

const TAB_ORDER: MediaType[] = ["all", "music", "movies", "tvshows", "history"];

const EmptyState = memo(({ type }: { type: MediaType }) => {
  const messages = {
    all: {
      title: "Nothing currently playing",
      subtitle: "Active sessions will appear here",
    },
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

// Provided here rather than in the layout so other routes (like /status)
// don't open a session stream
export default function MediaPage() {
  return (
    <MediaDataProvider>
      <Dashboard />
    </MediaDataProvider>
  );
}

function Dashboard() {
  const mediaData = useMediaSessions();
  const [activeTab, setActiveTab] = useState<MediaType>("all");

  const handleSwipeLeft = useCallback(() => {
    setActiveTab(
      TAB_ORDER[Math.min(TAB_ORDER.indexOf(activeTab) + 1, TAB_ORDER.length - 1)]
    );
  }, [activeTab]);

  const handleSwipeRight = useCallback(() => {
    setActiveTab(TAB_ORDER[Math.max(TAB_ORDER.indexOf(activeTab) - 1, 0)]);
  }, [activeTab]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: (e) => {
      if ((e.event.target as Element)?.closest?.('[role="dialog"]')) return;
      handleSwipeLeft();
    },
    onSwipedRight: (e) => {
      if ((e.event.target as Element)?.closest?.('[role="dialog"]')) return;
      handleSwipeRight();
    },
    preventScrollOnSwipe: true,
  });

  const tracks = useMemo(() => mediaData?.tracks || [], [mediaData?.tracks]);
  const movies = useMemo(() => mediaData?.movies || [], [mediaData?.movies]);
  const episodes = useMemo(
    () => mediaData?.episodes || [],
    [mediaData?.episodes]
  );

  // Changes when any session starts, stops, or moves to new media (e.g. next track)
  const sessionRevision = useMemo(
    () =>
      [...tracks, ...movies, ...episodes]
        // Merged cards hide their secondary sessions; count each one
        .flatMap((item) => (item.streams ?? [item]).map((s) => `${s.sessionId}:${item.id}`))
        .sort()
        .join("|"),
    [tracks, movies, episodes]
  );

  const { history, hasMore: historyHasMore, loading: historyLoading, loadingMore: historyLoadingMore, loadMore: loadMoreHistory } = useHistory({
    active: activeTab === "history",
    revision: sessionRevision,
  });
  
  // Determine grid columns based on tab type
  const gridColumns = useMemo(() => {
    switch (activeTab) {
      case "music": return 4;
      case "movies": return 5;
      case "tvshows": return 4;
      default: return 1;
    }
  }, [activeTab]);

  // Get current items count
  const currentItemsCount = useMemo(() => {
    switch (activeTab) {
      case "all":
        return tracks.length + movies.length + episodes.length;
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
      { href: "#all", label: "All", count: tracks.length + movies.length + episodes.length },
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
      case "all": {
        const allItems = [
          ...tracks.map((item) => ({ kind: "music" as const, item })),
          ...movies.map((item) => ({ kind: "movie" as const, item })),
          ...episodes.map((item) => ({ kind: "tv" as const, item })),
        ];
        if (allItems.length === 0) {
          return <EmptyState type="all" />;
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6" role="group" aria-label="All media">
            {allItems.map(({ kind, item }) => {
              if (kind === "music") return <MusicCard key={item.sessionId} track={item} />;
              if (kind === "movie") return <MovieCard key={item.sessionId} item={item} />;
              return <TVShowCard key={item.sessionId} item={item} showSeriesPoster />;
            })}
          </div>
        );
      }

      case "music":
        if (tracks.length === 0) {
          return <EmptyState type="music" />;
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" role="group" aria-label="Music tracks">
            {tracks.map((track, index) => (
              <div
                key={track.sessionId}
                ref={setItemRef(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={index === 0 ? 0 : -1}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded-lg"
              >
                <MusicCard track={track} />
              </div>
            ))}
          </div>
        );

      case "movies":
        if (movies.length === 0) {
          return <EmptyState type="movies" />;
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6" role="group" aria-label="Movies">
            {movies.map((movie, index) => (
              <div
                key={movie.sessionId}
                ref={setItemRef(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={index === 0 ? 0 : -1}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded-lg"
              >
                <MovieCard item={movie} showBackdrop />
              </div>
            ))}
          </div>
        );

      case "tvshows":
        if (episodes.length === 0) {
          return <EmptyState type="tvshows" />;
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6" role="group" aria-label="TV Shows">
            {episodes.map((episode, index) => (
              <div
                key={episode.sessionId}
                ref={setItemRef(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={index === 0 ? 0 : -1}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded-lg"
              >
                <TVShowCard item={episode} />
              </div>
            ))}
          </div>
        );

      case "history":
        return <HistoryTable items={history} loading={historyLoading} loadingMore={historyLoadingMore} hasMore={historyHasMore} onLoadMore={loadMoreHistory} />;
    }
  }, [activeTab, tracks, movies, episodes, history, historyLoading, historyLoadingMore, historyHasMore, loadMoreHistory, setItemRef, handleKeyDown]);

  return (
    <MediaDashboard>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-[var(--accent)] text-white px-4 py-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">
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
      <ServiceLinksMenu />
    </MediaDashboard>
  );
}
