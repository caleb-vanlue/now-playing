import React, { useState, useMemo, useEffect, useRef, memo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { HistoryEntry } from "../../types/media";
import { formatNames } from "../../utils/mediaCardUtils";
import { SourceIcon } from "./CardComponents";
import { TimeAgo } from "./TimeAgo";

interface HistoryTableProps {
  items: HistoryEntry[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

function historyItemKey(item: HistoryEntry): string {
  return `${item.source}-${item.id}-${item.viewedAt}-${item.userNames.join(",")}`;
}

const HistoryItemCard = memo(
  ({
    item,
    index,
  }: {
    item: HistoryEntry;
    index: number;
  }) => {
    const [hasImageError, setHasImageError] = useState(false);
    const viewedDate = new Date(item.viewedAt * 1000);

    const getAspectRatioClass = (type: string) => {
      switch (type) {
        case "track":
          return "aspect-square";
        case "movie":
          return "aspect-[2/3]";
        case "episode":
          return "aspect-video";
        default:
          return "aspect-[2/3]";
      }
    };

    const thumbnail = (sizes: string) =>
      item.thumb && !hasImageError ? (
        <Image
          src={item.thumb}
          alt={item.displayTitle}
          fill
          sizes={sizes}
          className="object-cover"
          loading="lazy"
          quality={60}
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl">
          {item.type === "episode" ? "📺" : item.type === "movie" ? "🎬" : "🎵"}
        </div>
      );

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: Math.min(index, 10) * 0.02,
          duration: 0.3,
        }}
        className="relative bg-[var(--card-background)] rounded-lg p-4 hover:bg-[var(--card-background-hover)] transition-colors hardware-accelerated card-transition"
      >
          <div className="flex gap-3">
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <div className="w-20 h-14 flex items-center justify-center">
              <div
                className={`${getAspectRatioClass(item.type)} h-full relative rounded overflow-hidden bg-[var(--background)]`}
              >
                {thumbnail("100px")}
              </div>
            </div>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--accent)]/20 text-[var(--accent-light)]"
            >
              {item.type === "episode"
                ? "TV Show"
                : item.type === "movie"
                  ? "Movie"
                  : "Music"}
            </span>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-2">
                <h3 className="font-medium text-white leading-tight truncate flex-1 min-w-0">
                  {item.displayTitle}
                </h3>
                <div className="flex-shrink-0 pt-0.5 sm:hidden">
                  <SourceIcon source={item.source} size={20} />
                </div>
              </div>
              {item.displaySubtitle && (
                <p className="text-sm text-gray-400 mt-0.5 truncate">
                  {item.displaySubtitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400" title={item.userNames.join(", ")}>
                Played by {formatNames(item.userNames)}
                {item.userNames.length === 1 && item.playCount > 1 && ` · ${item.playCount} devices`}
              </span>
              <TimeAgo
                date={viewedDate}
                className="text-xs text-gray-400 sm:hidden ml-auto whitespace-nowrap"
              />
            </div>
          </div>

          <div className="flex-shrink-0 hidden sm:flex flex-col items-end justify-between">
            <SourceIcon source={item.source} size={20} />
            <TimeAgo
              date={viewedDate}
              className="text-sm text-gray-400 whitespace-nowrap"
            />
          </div>
        </div>
      </motion.div>
    );
  }
);

HistoryItemCard.displayName = "HistoryItemCard";

export default function HistoryTable({ items, loading, loadingMore, hasMore, onLoadMore }: HistoryTableProps) {
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(loadingMore);
  const sentinelVisibleRef = useRef(false);
  const prevLoadingMoreRef = useRef(false);

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (selectedUser !== "all")
      filtered = filtered.filter((item) => item.userNames.includes(selectedUser));
    if (selectedType !== "all")
      filtered = filtered.filter((item) => item.type === selectedType);
    if (selectedSource !== "all")
      filtered = filtered.filter((item) => item.source === selectedSource);
    return filtered;
  }, [items, selectedUser, selectedType, selectedSource]);

  const users = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => item.userNames.forEach((name) => set.add(name)));
    return Array.from(set).sort();
  }, [items]);

  const mediaTypes = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => set.add(item.type));
    return Array.from(set).sort();
  }, [items]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => set.add(item.source));
    return Array.from(set).sort();
  }, [items]);

  useEffect(() => {
    loadingMoreRef.current = loadingMore ?? false;
  }, [loadingMore]);

  useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        sentinelVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting && !loadingMoreRef.current) onLoadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, filteredItems.length]);

  useEffect(() => {
    if (prevLoadingMoreRef.current && !loadingMore) {
      if (sentinelVisibleRef.current && hasMore) onLoadMore?.();
    }
    prevLoadingMoreRef.current = loadingMore ?? false;
  }, [loadingMore, hasMore, onLoadMore]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center text-gray-500 py-20">
        <p className="text-xl">No watch history found</p>
        <p className="mt-2">Your viewing history will appear here</p>
      </div>
    );
  }

  const selectStyles =
    "w-full appearance-none bg-[var(--card-background)] text-white border border-gray-800 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:border-[var(--accent)] transition-all duration-200 cursor-pointer hover:bg-[var(--card-background-hover)]";

  const chevron = (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
      <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
      </svg>
    </div>
  );

  const filterSection = (
    <div className="mb-4 flex flex-col sm:flex-row gap-3">
      <div className="relative w-full sm:w-auto">
        <label htmlFor="user-filter" className="sr-only">Filter by user</label>
        <select
          id="user-filter"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className={selectStyles}
          aria-label="Filter by user"
        >
          <option value="all">All Users</option>
          {users.map((user) => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>
        {chevron}
      </div>

      <div className="relative w-full sm:w-auto">
        <label htmlFor="type-filter" className="sr-only">Filter by media type</label>
        <select
          id="type-filter"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className={selectStyles}
          aria-label="Filter by media type"
        >
          <option value="all">All Types</option>
          {mediaTypes.map((type) => (
            <option key={type} value={type}>
              {type === "episode" ? "TV Shows" : type === "movie" ? "Movies" : "Music"}
            </option>
          ))}
        </select>
        {chevron}
      </div>

      {sources.length > 1 && (
        <div className="relative w-full sm:w-auto">
          <label htmlFor="source-filter" className="sr-only">Filter by source</label>
          <select
            id="source-filter"
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className={selectStyles}
            aria-label="Filter by source"
          >
            <option value="all">All Sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source.charAt(0).toUpperCase() + source.slice(1)}
              </option>
            ))}
          </select>
          {chevron}
        </div>
      )}

      {(selectedUser !== "all" || selectedType !== "all" || selectedSource !== "all") && (
        <button
          onClick={() => { setSelectedUser("all"); setSelectedType("all"); setSelectedSource("all"); }}
          className="text-sm text-gray-400 hover:text-[var(--accent)] transition-colors sm:ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded px-2 py-1"
          aria-label="Clear all filters"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  if (filteredItems.length === 0) {
    return (
      <div>
        {filterSection}
        <div className="text-center text-gray-500 py-20">
          <p className="text-xl">No items match your filters</p>
          <p className="mt-2">Try adjusting your filter settings</p>
        </div>
        {hasMore && <div ref={sentinelRef} className="h-1" />}
      </div>
    );
  }

  return (
    <>
      {filterSection}

      <div className="space-y-3">
        {filteredItems.map((item, index) => (
          <HistoryItemCard key={historyItemKey(item)} item={item} index={index} />
        ))}
      </div>

      {loadingMore && (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="h-1" />}

      {!hasMore && items.length > 0 && (
        <p className="text-center text-gray-400 text-sm pt-8">
          &copy; {new Date().getFullYear()} Caleb Van Lue. Thanks for visiting!
        </p>
      )}
    </>
  );
}
