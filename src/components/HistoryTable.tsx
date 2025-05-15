import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { HistoryItem } from "../../types/media";
import { getTimeAgo } from "../../utils/dateUtils";
import { getThumbnailUrl } from "../../utils/plexApi";

interface HistoryTableProps {
  items: HistoryItem[];
  loading?: boolean;
}

interface ImageStateMap {
  [key: string]: boolean;
}

export default function HistoryTable({ items, loading }: HistoryTableProps) {
  const [imageErrors, setImageErrors] = useState<ImageStateMap>({});
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    return () => {
      setImageErrors({});
    };
  }, []);

  // Helper function to map accountID to username
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

  // Get unique users from the history items
  const users = useMemo(() => {
    const userSet = new Set<string>();
    items.forEach((item) => {
      const userName = getUserNameFromAccountId(item.accountID);
      userSet.add(userName);
    });
    return Array.from(userSet).sort();
  }, [items]);

  // Get media types from the history items
  const mediaTypes = useMemo(() => {
    const typeSet = new Set<string>();
    items.forEach((item) => {
      typeSet.add(item.type);
    });
    return Array.from(typeSet).sort();
  }, [items]);

  // Filter items based on selected user and type
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

  const getAspectRatioClass = (type: string) => {
    switch (type) {
      case "track":
        return "aspect-square"; // 1:1 for music
      case "movie":
        return "aspect-[2/3]"; // 2:3 for movies (portrait)
      case "episode":
        return "aspect-video"; // 16:9 for TV shows
      default:
        return "aspect-[2/3]";
    }
  };

  const handleImageError = (itemKey: string) => {
    setImageErrors((prev) => ({ ...prev, [itemKey]: true }));
  };

  const filterSection = (
    <div className="mb-4 flex flex-col sm:flex-row gap-3">
      <div className="relative w-full sm:w-auto">
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full appearance-none bg-gray-800 text-white border border-gray-700 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 cursor-pointer hover:bg-gray-750"
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
          className="w-full appearance-none bg-gray-800 text-white border border-gray-700 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 cursor-pointer hover:bg-gray-750"
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
          className="text-sm text-gray-400 hover:text-white transition-colors sm:ml-auto"
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

      {/* Content */}
      <div className="space-y-3">
        {filteredItems.map((item, index) => {
          const itemKey = `${item.historyKey}-${index}`;
          const thumbnailUrl = getThumbnailUrl(item.thumb, {
            quality: "low",
            width: 100,
          });
          const viewedDate = new Date(item.viewedAt * 1000);
          const timeAgo = getTimeAgo(viewedDate);
          const hasImageError = imageErrors[itemKey];

          return (
            <motion.div
              key={itemKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="bg-gray-900/30 rounded-lg p-4 hover:bg-gray-900/40 transition-colors"
            >
              {/* Desktop Layout */}
              <div className="hidden sm:flex items-center gap-4">
                {/* Fixed-width Thumbnail Container */}
                <div className="flex-shrink-0 w-24 h-16 flex items-center justify-center">
                  <div
                    className={`${getAspectRatioClass(
                      item.type
                    )} h-full relative rounded overflow-hidden bg-gray-800`}
                  >
                    {thumbnailUrl && !hasImageError ? (
                      <Image
                        src={thumbnailUrl}
                        alt={item.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                        loading="lazy"
                        quality={50}
                        unoptimized={true}
                        onError={() => handleImageError(itemKey)}
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

                {/* Content */}
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
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.type === "episode"
                          ? "bg-blue-900/30 text-blue-300"
                          : item.type === "movie"
                          ? "bg-purple-900/30 text-purple-300"
                          : "bg-green-900/30 text-green-300"
                      }`}
                    >
                      {item.type === "episode"
                        ? "TV Show"
                        : item.type === "movie"
                        ? "Movie"
                        : "Music"}
                    </span>
                  </div>
                </div>

                {/* Time */}
                <div className="flex-shrink-0">
                  <span className="text-sm text-gray-400">{timeAgo}</span>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="flex sm:hidden flex-col gap-3">
                <div className="flex items-start gap-3">
                  {/* Fixed-width Thumbnail Container */}
                  <div className="flex-shrink-0 w-20 h-20 flex items-center justify-center">
                    <div
                      className={`${getAspectRatioClass(
                        item.type
                      )} h-full relative rounded overflow-hidden bg-gray-800`}
                    >
                      {thumbnailUrl && !hasImageError ? (
                        <Image
                          src={thumbnailUrl}
                          alt={item.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                          loading="lazy"
                          quality={50}
                          unoptimized={true}
                          onError={() => handleImageError(itemKey)}
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

                  {/* Content */}
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
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.type === "episode"
                          ? "bg-blue-900/30 text-blue-300"
                          : item.type === "movie"
                          ? "bg-purple-900/30 text-purple-300"
                          : "bg-green-900/30 text-green-300"
                      }`}
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
        })}
      </div>
    </>
  );
}
