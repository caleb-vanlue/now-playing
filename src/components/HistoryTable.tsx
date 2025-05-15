import React, { useState, useMemo, useEffect, memo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { HistoryItem } from "../../types/media";
import { getTimeAgo } from "../../utils/dateUtils";
import { getThumbnailUrl } from "../../utils/plexApi";
import { useInView } from "react-intersection-observer";

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
    const itemKey = `${item.historyKey}-${index}`;
    const thumbnailUrl = getThumbnailUrl(item.thumb, {
      quality: "low",
      width: 100,
    });
    const viewedDate = new Date(item.viewedAt * 1000);
    const timeAgo = getTimeAgo(viewedDate);
    const hasImageError = imageErrors[itemKey];

    const [ref, inView] = useInView({
      triggerOnce: true,
      rootMargin: "400px 0px",
      threshold: 0.1,
    });

    const getAspectRatioClass = (type: string) => {
      switch (type) {
        case "track":
          return "aspect-square"; // 1:1 for music
        case "movie":
          return "aspect-[2/3]"; // 2:3 for movies
        case "episode":
          return "aspect-video"; // 16:9 for TV shows
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

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: Math.min(index, 10) * 0.02,
          duration: 0.3,
        }}
        className="bg-[#1c1c1c] rounded-lg p-4 hover:bg-[#252525] transition-colors hardware-accelerated card-transition"
      >
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex-shrink-0 w-24 h-16 flex items-center justify-center">
            <div
              className={`${getAspectRatioClass(
                item.type
              )} h-full relative rounded overflow-hidden bg-[#141414]`}
            >
              {thumbnailUrl && !hasImageError && inView ? (
                <Image
                  src={thumbnailUrl}
                  alt={item.title}
                  fill
                  sizes="80px"
                  className="object-cover"
                  loading="eager"
                  quality={60}
                  onError={() => onImageError(itemKey)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl">
                  {item.type === "episode"
                    ? "📺"
                    : item.type === "movie"
                    ? "🎬"
                    : "🎵"}
                </div>
              )}
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
            <div className="flex items-center gap-3 mt-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeStyles(
                  item.type
                )}`}
              >
                {item.type === "episode"
                  ? "TV Show"
                  : item.type === "movie"
                  ? "Movie"
                  : "Music"}
              </span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <span className="text-sm text-gray-400">{timeAgo}</span>
          </div>
        </div>

        <div className="flex sm:hidden flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-20 h-20 flex items-center justify-center">
              <div
                className={`${getAspectRatioClass(
                  item.type
                )} h-full relative rounded overflow-hidden bg-[#141414]`}
              >
                {thumbnailUrl && !hasImageError && inView ? (
                  <Image
                    src={thumbnailUrl}
                    alt={item.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                    loading="eager"
                    quality={60}
                    onError={() => onImageError(itemKey)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-3xl">
                    {item.type === "episode"
                      ? "📺"
                      : item.type === "movie"
                      ? "🎬"
                      : "🎵"}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white leading-tight">
                {item.displayTitle}
              </h3>
              {item.displaySubtitle && (
                <p className="text-sm text-gray-400 mt-0.5">
                  {item.displaySubtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="w-20 flex justify-center">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeStyles(
                  item.type
                )}`}
              >
                {item.type === "episode"
                  ? "TV Show"
                  : item.type === "movie"
                  ? "Movie"
                  : "Music"}
              </span>
            </div>
            <span className="text-sm text-gray-400">{timeAgo}</span>
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
    return () => {
      setImageErrors({});
    };
  }, []);

  const getUserNameFromAccountId = (accountId: number): string => {
    switch (accountId) {
      case 1:
        return "Caleb";
      case 324439592:
        return "Matt";
      default:
        return `User ${accountId}`;
    }
  };

  const users = useMemo(() => {
    const userSet = new Set<string>();
    items.forEach((item) => {
      const userName = getUserNameFromAccountId(item.accountID);
      userSet.add(userName);
    });
    return Array.from(userSet).sort();
  }, [items]);

  const mediaTypes = useMemo(() => {
    const typeSet = new Set<string>();
    items.forEach((item) => {
      typeSet.add(item.type);
    });
    return Array.from(typeSet).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    let filtered = items;

    if (selectedUser !== "all") {
      filtered = filtered.filter((item) => {
        const userName = getUserNameFromAccountId(item.accountID);
        return userName === selectedUser;
      });
    }

    if (selectedType !== "all") {
      filtered = filtered.filter((item) => item.type === selectedType);
    }

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

  const filterSection = (
    <div className="mb-4 flex flex-col sm:flex-row gap-3">
      <div className="relative w-full sm:w-auto">
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className={selectStyles}
        >
          <option value="all">All Users</option>
          {users.map((user) => (
            <option key={user} value={user}>
              {user}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
          <svg
            className="h-4 w-4 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      <div className="relative w-full sm:w-auto">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className={selectStyles}
        >
          <option value="all">All Types</option>
          {mediaTypes.map((type) => (
            <option key={type} value={type}>
              {type === "episode"
                ? "TV Shows"
                : type === "movie"
                ? "Movies"
                : "Music"}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
          <svg
            className="h-4 w-4 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      {(selectedUser !== "all" || selectedType !== "all") && (
        <button
          onClick={() => {
            setSelectedUser("all");
            setSelectedType("all");
          }}
          className="text-sm text-gray-400 hover:text-orange-500 transition-colors sm:ml-auto"
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
            key={`${item.historyKey}-${index}`}
            item={item}
            index={index}
            imageErrors={imageErrors}
            onImageError={handleImageError}
          />
        ))}
      </div>
    </>
  );
}
