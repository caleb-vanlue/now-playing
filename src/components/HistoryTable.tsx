import React, { useState, useMemo, useEffect, memo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { HistoryItem } from "../../types/media";
import { getTimeAgo } from "../../utils/dateUtils";

interface HistoryTableProps {
  items: HistoryItem[];
  loading?: boolean;
}

interface ImageStateMap {
  [key: string]: boolean;
}

const HistoryItemCard = memo(
  ({
    item,
    index,
    imageErrors,
    onImageError,
  }: {
    item: HistoryItem;
    index: number;
    imageErrors: ImageStateMap;
    onImageError: (itemKey: string) => void;
  }) => {
    const itemKey = `${item.id}-${index}`;
    const viewedDate = new Date(item.viewedAt * 1000);
    const timeAgo = getTimeAgo(viewedDate);
    const hasImageError = imageErrors[itemKey];

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

    const getTypeStyles = (type: string) => {
      return (
        {
          episode: "bg-orange-500/30 text-orange-300",
          movie: "bg-orange-600/30 text-orange-200",
          track: "bg-orange-700/30 text-orange-100",
        }[type] || "bg-orange-500/30 text-orange-300"
      );
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
          onError={() => onImageError(itemKey)}
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
        className="bg-[#1c1c1c] rounded-lg p-4 hover:bg-[#252525] transition-colors hardware-accelerated card-transition"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-20 h-14 flex items-center justify-center">
            <div
              className={`${getAspectRatioClass(item.type)} h-full relative rounded overflow-hidden bg-[#141414]`}
            >
              {thumbnail("100px")}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white leading-tight truncate">
              {item.displayTitle}
            </h3>
            {item.displaySubtitle && (
              <p className="text-sm text-gray-400 mt-0.5 truncate">
                {item.displaySubtitle}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeStyles(item.type)}`}
              >
                {item.type === "episode"
                  ? "TV Show"
                  : item.type === "movie"
                    ? "Movie"
                    : "Music"}
              </span>
              <span className="text-xs text-gray-400">
                Played by {item.userName}
              </span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <span className="text-sm text-gray-400 whitespace-nowrap">
              {timeAgo}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }
);

HistoryItemCard.displayName = "HistoryItemCard";

export default function HistoryTable({ items, loading }: HistoryTableProps) {
  const [imageErrors, setImageErrors] = useState<ImageStateMap>({});
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    return () => setImageErrors({});
  }, []);

  const users = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => set.add(item.userName));
    return Array.from(set).sort();
  }, [items]);

  const mediaTypes = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => set.add(item.type));
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (selectedUser !== "all")
      filtered = filtered.filter((item) => item.userName === selectedUser);
    if (selectedType !== "all")
      filtered = filtered.filter((item) => item.type === selectedType);
    return filtered;
  }, [items, selectedUser, selectedType]);

  const handleImageError = (itemKey: string) => {
    setImageErrors((prev) => ({ ...prev, [itemKey]: true }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
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
    "w-full appearance-none bg-[#1c1c1c] text-white border border-gray-800 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 cursor-pointer hover:bg-[#252525]";

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

      {(selectedUser !== "all" || selectedType !== "all") && (
        <button
          onClick={() => { setSelectedUser("all"); setSelectedType("all"); }}
          className="text-sm text-gray-400 hover:text-orange-500 transition-colors sm:ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414] rounded px-2 py-1"
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
      </div>
    );
  }

  return (
    <>
      {filterSection}

      <div className="space-y-3">
        {filteredItems.map((item, index) => (
          <HistoryItemCard
            key={`${item.id}-${index}`}
            item={item}
            index={index}
            imageErrors={imageErrors}
            onImageError={handleImageError}
          />
        ))}
      </div>

      <p className="text-center text-gray-400 text-sm pt-8">
        &copy; {new Date().getFullYear()} Caleb Van Lue. Thanks for visiting!
      </p>
    </>
  );
}
