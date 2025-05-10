import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Track } from "../../types/media";
import { getThumbnailUrl } from "../../utils/api";
import { getTimeAgo } from "../../utils/dateUtils";

interface MusicCardProps {
  track: Track;
  index?: number;
}

export default function MusicCard({ track, index = 0 }: MusicCardProps) {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    title,
    artist,
    album,
    userId,
    state,
    thumbnailFileId,
    player,
    startTime,
    sessionId,
  } = track;

  const thumbnailUrl = getThumbnailUrl(thumbnailFileId);
  const bgColorClass = "bg-gray-800";

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoaded = () => {
    setImageLoaded(true);
  };

  const startedAt = new Date(startTime);
  const timeAgo = getTimeAgo(startedAt);

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

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
      className="bg-[#1c1c1c] rounded-lg overflow-hidden shadow-md relative"
    >
      <div className="cursor-pointer" onClick={toggleDetails}>
        <div className="relative overflow-hidden">
          {thumbnailUrl && !imageError ? (
            <div className="aspect-[1] relative">
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
            </div>
          ) : (
            <motion.div
              variants={imageVariants}
              className={`aspect-square ${bgColorClass} flex items-center justify-center p-4 text-center`}
            >
              <span className="text-lg font-bold">{album}</span>
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
          <h2 className="text-xl font-bold truncate" title={title}>
            {title}
          </h2>
          <p className="truncate" title={artist}>
            {artist}
          </p>
          <p className="text-gray-400 truncate" title={album}>
            {album}
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
              <h2 className="text-xl font-bold">{title}</h2>
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
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-4 stagger-item stagger-delay-1"
              >
                <p className="text-gray-400 text-sm">Artist</p>
                <p>{artist}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-4 stagger-item stagger-delay-2"
              >
                <p className="text-gray-400 text-sm">Album</p>
                <p>{album}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 gap-3"
              >
                <div className="stagger-item stagger-delay-3">
                  <p className="text-gray-400 text-sm">Device</p>
                  <p>{player}</p>
                </div>
                <div className="stagger-item stagger-delay-4">
                  <p className="text-gray-400 text-sm">User</p>
                  <p>{userId}</p>
                </div>
                <div className="stagger-item stagger-delay-5">
                  <p className="text-gray-400 text-sm">Started</p>
                  <p>{startedAt.toLocaleTimeString()}</p>
                </div>
                <div className="stagger-item stagger-delay-6">
                  <p className="text-gray-400 text-sm">Status</p>
                  <p className="capitalize">{state}</p>
                </div>
                <div className="stagger-item stagger-delay-7 col-span-2">
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
