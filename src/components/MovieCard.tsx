import React, { useState, useRef, useEffect } from "react";
import { Movie, Episode } from "../../types/media";
import { getThumbnailUrl } from "../../utils/api";

interface MovieCardProps {
  item: Movie | Episode;
  type: "movie" | "tvshow";
}

export default function MovieCard({ item, type }: MovieCardProps) {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    title,
    userId,
    state,
    thumbnailFileId,
    player,
    startTime,
    duration,
    summary,
  } = item;

  const year =
    type === "movie"
      ? (item as Movie).year
      : `S${(item as Episode).season}:E${(item as Episode).episode}`;

  const directorOrShow =
    type === "movie" ? (item as Movie).director : (item as Episode).showTitle;

  const thumbnailUrl = getThumbnailUrl(thumbnailFileId);

  const bgColorClass = "bg-gray-800";

  const handleImageError = () => {
    setImageError(true);
  };

  const startedAt = new Date(startTime);
  const timeAgo = getTimeAgo(startedAt);

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const durationMinutes = Math.round(duration / 60000);
  const formattedDuration =
    durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
      : `${durationMinutes}m`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setShowDetails(false);
      }
    };

    if (showDetails) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDetails]);

  return (
    <div
      ref={cardRef}
      className="bg-[#1c1c1c] rounded-lg overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg relative"
    >
      <div className="cursor-pointer" onClick={toggleDetails}>
        <div className="relative">
          {thumbnailUrl && !imageError ? (
            <div className="aspect-[2/3] relative">
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            </div>
          ) : (
            <div
              className={`aspect-[2/3] ${bgColorClass} flex items-center justify-center p-4 text-center`}
            >
              <span className="text-lg font-bold">{title}</span>
            </div>
          )}
          <div
            className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${
              state === "playing" ? "bg-green-500" : "bg-gray-700"
            }`}
          >
            {state === "playing" ? (
              <div className="flex items-center">
                <span className="mr-1">Playing</span>
                <span className="flex space-x-0.5">
                  <span className="w-0.5 h-2 bg-white animate-pulse"></span>
                  <span className="w-0.5 h-2 bg-white animate-pulse delay-75"></span>
                  <span className="w-0.5 h-2 bg-white animate-pulse delay-150"></span>
                </span>
              </div>
            ) : (
              "Paused"
            )}
          </div>
        </div>
        <div className="p-4">
          <h2 className="text-xl font-bold truncate" title={title}>
            {title}
          </h2>
          <p>{year}</p>
          <p className="text-gray-400 truncate" title={directorOrShow}>
            {type === "movie" ? "Director:" : "Show:"} {directorOrShow}
          </p>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                {userId.charAt(0)}
              </div>
              <span className="ml-2 truncate max-w-[80px]" title={userId}>
                {userId}
              </span>
            </div>
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 rounded-lg overflow-hidden flex flex-col">
          <div className="flex justify-between items-start p-4">
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              onClick={toggleDetails}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {summary && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm">Summary</p>
                <p className="text-sm leading-tight">{summary}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-400 text-sm">Device</p>
                <p>{player}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Duration</p>
                <p>{formattedDuration}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Started</p>
                <p>{startedAt.toLocaleTimeString()}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Type</p>
                <p className="capitalize">{type}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-400 text-sm">Session ID</p>
                <p className="font-mono text-xs">{item.sessionId}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);

  if (diffMin < 1) {
    return "Just now";
  } else if (diffMin === 1) {
    return "1 minute ago";
  } else if (diffMin < 60) {
    return `${diffMin} minutes ago`;
  } else {
    const diffHours = Math.round(diffMin / 60);
    if (diffHours === 1) {
      return "1 hour ago";
    } else {
      return `${diffHours} hours ago`;
    }
  }
}
