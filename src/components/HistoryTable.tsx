import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { FixedSizeList } from "react-window";
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

interface RowProps {
  data: {
    items: HistoryItem[];
    imageErrors: ImageStateMap;
    handleImageError: (key: string) => void;
  };
  index: number;
  style: React.CSSProperties;
}

// Mobile row component
const MobileRow: React.FC<RowProps> = ({ data, index, style }) => {
  const { items, imageErrors, handleImageError } = data;
  const item = items[index];
  const itemKey = `${item.historyKey}-${index}`;
  const thumbnailUrl = getThumbnailUrl(item.thumb, {
    quality: "low",
    width: 100,
  });
  const viewedDate = new Date(item.viewedAt * 1000);
  const timeAgo = getTimeAgo(viewedDate);
  const hasImageError = imageErrors[itemKey];

  const getAspectRatioClass = (type: string) => {
    switch (type) {
      case "track":
        return "w-12 h-12";
      case "movie":
        return "w-8 h-12";
      case "episode":
        return "w-16 h-10";
      default:
        return "w-8 h-12";
    }
  };

  return (
    <div style={{ ...style, padding: "0 12px" }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.01 }}
        className="bg-gray-900/30 rounded-lg p-4 mb-3"
      >
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div
              className={`${getAspectRatioClass(
                item.type
              )} relative rounded overflow-hidden bg-gray-800`}
            >
              {thumbnailUrl && !hasImageError ? (
                <Image
                  src={thumbnailUrl}
                  alt={item.title}
                  fill
                  sizes="48px"
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
              <span className="text-sm text-gray-400">{timeAgo}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Desktop row component
const DesktopRow: React.FC<RowProps> = ({ data, index, style }) => {
  const { items, imageErrors, handleImageError } = data;
  const item = items[index];
  const itemKey = `${item.historyKey}-${index}`;
  const thumbnailUrl = getThumbnailUrl(item.thumb, {
    quality: "low",
    width: 100,
  });
  const viewedDate = new Date(item.viewedAt * 1000);
  const timeAgo = getTimeAgo(viewedDate);
  const hasImageError = imageErrors[itemKey];

  const getAspectRatioClass = (type: string) => {
    switch (type) {
      case "track":
        return "w-12 h-12";
      case "movie":
        return "w-8 h-12";
      case "episode":
        return "w-16 h-10";
      default:
        return "w-8 h-12";
    }
  };

  return (
    <div style={style}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.01 }}
        className="flex items-center border-b border-gray-800/50 hover:bg-gray-900/30 transition-colors px-3 sm:px-4"
      >
        <div className="py-4 pr-4 w-24">
          <div className="flex items-center">
            <div
              className={`${getAspectRatioClass(
                item.type
              )} relative rounded overflow-hidden bg-gray-800 flex-shrink-0`}
            >
              {thumbnailUrl && !hasImageError ? (
                <Image
                  src={thumbnailUrl}
                  alt={item.title}
                  fill
                  sizes="48px"
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
        </div>

        <div className="py-4 pr-4 flex-1">
          <p className="font-medium text-white leading-tight">
            {item.displayTitle}
          </p>
          {item.displaySubtitle && (
            <p className="text-sm text-gray-400 mt-0.5">
              {item.displaySubtitle}
            </p>
          )}
        </div>

        <div className="py-4 pr-4 w-32">
          <span
            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
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

        <div className="py-4 w-32">
          <p className="text-sm font-medium">{timeAgo}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {viewedDate.toLocaleDateString()} at{" "}
            {viewedDate.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

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

  const handleImageError = useCallback((itemKey: string) => {
    setImageErrors((prev) => ({ ...prev, [itemKey]: true }));
  }, []);

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

  if (filteredItems.length === 0) {
    return (
      <div className="min-h-[500px]">
        {/* Filter dropdowns */}
        <div className="mb-4 px-3 sm:px-4 flex flex-wrap gap-3">
          <div className="relative inline-block">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="appearance-none bg-gray-800 text-white border border-gray-700 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 cursor-pointer hover:bg-gray-750"
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

          <div className="relative inline-block">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="appearance-none bg-gray-800 text-white border border-gray-700 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 cursor-pointer hover:bg-gray-750"
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
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="text-center text-gray-500 py-20">
          <p className="text-xl">No items match your filters</p>
          <p className="mt-2">Try adjusting your filter settings</p>
        </div>
      </div>
    );
  }

  const itemData = {
    items: filteredItems,
    imageErrors,
    handleImageError,
  };

  return (
    <div className="min-h-[500px]">
      {/* Filter dropdowns */}
      <div className="mb-4 px-3 sm:px-4 flex flex-wrap gap-3">
        <div className="relative inline-block">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="appearance-none bg-gray-800 text-white border border-gray-700 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 cursor-pointer hover:bg-gray-750"
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

        <div className="relative inline-block">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="appearance-none bg-gray-800 text-white border border-gray-700 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 cursor-pointer hover:bg-gray-750"
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
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Mobile Virtual List */}
      <div className="sm:hidden">
        <FixedSizeList
          height={600}
          itemCount={filteredItems.length}
          itemSize={130}
          width="100%"
          itemData={itemData}
        >
          {MobileRow}
        </FixedSizeList>
      </div>

      {/* Desktop Virtual List with Header */}
      <div className="hidden sm:block">
        <div className="flex items-center border-b border-gray-800 px-3 sm:px-4 py-3 text-sm font-medium text-gray-400">
          <div className="w-24">Artwork</div>
          <div className="flex-1">Title</div>
          <div className="w-32">Type</div>
          <div className="w-32">Watched</div>
        </div>

        <FixedSizeList
          height={600}
          itemCount={filteredItems.length}
          itemSize={80}
          width="100%"
          itemData={itemData}
        >
          {DesktopRow}
        </FixedSizeList>
      </div>
    </div>
  );
}
