import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Episode } from "../../types/media";
import { getTimeAgo } from "../../utils/dateUtils";
import { getThumbnailUrl } from "../../utils/plexApi";

interface TVShowCardProps {
  item: Episode;
  index?: number;
}

export default function TVShowCard({ item, index = 0 }: TVShowCardProps) {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
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
    sessionId,
    showTitle,
    season,
    episode,
    videoResolution,
    audioCodec,
    contentRating,
  } = item;

  const seasonEpisode = `S${season}:E${episode}`;
  const thumbnailUrl = getThumbnailUrl(thumbnailFileId);
  const bgColorClass = "bg-gray-800";

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

  function formatVideoQuality(): string {
    const parts = [];

    if (videoResolution) {
      parts.push(videoResolution.toUpperCase());
    }

    if (audioCodec) {
      parts.push(audioCodec.toUpperCase());
    }

    return parts.join(" • ");
  }

  useEffect(() => {
    if (!showDetails) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setShowDetails(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDetails]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: index * 0.05,
      },
    },
    hover: {
      y: -8,
      scale: 1.02,
      boxShadow:
        "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
      transition: { duration: 0.2 },
    },
  };

  const imageVariants = {
    hover: {
      scale: 1.05,
      transition: { duration: 0.4 },
    },
  };

  return (
    <motion.div
      ref={cardRef}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardVariants}
      className="bg-[#1c1c1c] rounded-lg overflow-hidden shadow-md relative col-span-2"
    >
      <div className="cursor-pointer" onClick={toggleDetails}>
        <div className="relative overflow-hidden">
          {thumbnailUrl && !imageError ? (
            <div className="aspect-[16/9] relative">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <motion.img
                variants={imageVariants}
                src={thumbnailUrl}
                alt={title}
                className={`w-full h-full object-cover ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onError={() => setImageError(true)}
                onLoad={() => setImageLoaded(true)}
                style={{ transition: "opacity 0.3s" }}
              />

              {/* Episode Badge */}
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm font-semibold">
                {seasonEpisode}
              </div>

              {/* Content Rating Badge (if available) */}
              {contentRating && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                  {contentRating}
                </div>
              )}
            </div>
          ) : (
            <motion.div
              variants={imageVariants}
              className={`aspect-[16/9] ${bgColorClass} flex items-center justify-center p-4 text-center`}
            >
              <span className="text-lg font-bold">{title}</span>
            </motion.div>
          )}

          <div
            className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full
        ${
          state === "playing"
            ? "bg-green-500 shadow-sm shadow-green-500/30"
            : "bg-gray-700"
        }`}
          >
            {state === "playing" ? (
              <div className="flex items-center">
                <span className="mr-1">Playing</span>
                <div className="flex items-end space-x-0.5 h-2">
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      className="w-0.5 h-2 bg-white equalizer-bar"
                    ></span>
                  ))}
                </div>
              </div>
            ) : (
              "Paused"
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold truncate" title={title}>
              {title}
            </h2>
            <p className="text-gray-400 truncate font-medium" title={showTitle}>
              {showTitle}
            </p>

            {/* Tech Specs */}
            <div className="mt-2">
              <p className="text-gray-400 text-sm flex items-center gap-2">
                <span>{formattedDuration}</span>
                {formatVideoQuality() && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span>{formatVideoQuality()}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
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

      {/* Details popup */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="absolute inset-0 z-30 overflow-hidden rounded-lg shadow-xl bg-[#141414]/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex justify-between items-start p-4 border-b border-gray-800/50"
            >
              <div>
                <h2 className="text-xl font-bold">{title}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                  <span>{showTitle}</span>
                  <span className="text-gray-600">•</span>
                  <span>{seasonEpisode}</span>
                  {contentRating && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span>{contentRating}</span>
                    </>
                  )}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleDetails}
                className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center"
              >
                ×
              </motion.button>
            </motion.div>

            <div
              className="p-4 overflow-y-auto"
              style={{ maxHeight: "calc(100% - 60px)" }}
            >
              {summary && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-4"
                >
                  <p className="text-gray-400 text-sm">Summary</p>
                  <p className="text-sm leading-tight">{summary}</p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 gap-3"
              >
                <div className="stagger-item stagger-delay-1">
                  <p className="text-gray-400 text-sm">Show</p>
                  <p>{showTitle}</p>
                </div>
                <div className="stagger-item stagger-delay-2">
                  <p className="text-gray-400 text-sm">Episode</p>
                  <p>{seasonEpisode}</p>
                </div>
                {videoResolution && (
                  <div className="stagger-item stagger-delay-3">
                    <p className="text-gray-400 text-sm">Quality</p>
                    <p className="uppercase">{videoResolution}</p>
                  </div>
                )}
                {audioCodec && (
                  <div className="stagger-item stagger-delay-4">
                    <p className="text-gray-400 text-sm">Audio</p>
                    <p className="uppercase">{audioCodec}</p>
                  </div>
                )}
                <div className="stagger-item stagger-delay-5">
                  <p className="text-gray-400 text-sm">Duration</p>
                  <p>{formattedDuration}</p>
                </div>
                <div className="stagger-item stagger-delay-6">
                  <p className="text-gray-400 text-sm">Device</p>
                  <p>{player}</p>
                </div>
                <div className="stagger-item stagger-delay-7">
                  <p className="text-gray-400 text-sm">Started</p>
                  <p>{startedAt.toLocaleTimeString()}</p>
                </div>
                <div className="stagger-item stagger-delay-8">
                  <p className="text-gray-400 text-sm">User</p>
                  <p>{userId}</p>
                </div>
                <div className="stagger-item stagger-delay-9 col-span-2 pb-4">
                  <p className="text-gray-400 text-sm">Session ID</p>
                  <p className="font-mono text-xs">{sessionId}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
