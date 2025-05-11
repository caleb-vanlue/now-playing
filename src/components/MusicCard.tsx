import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Track } from "../../types/media";
import { getThumbnailUrl } from "../../utils/api";
import { getTimeAgo } from "../../utils/dateUtils";
import { useSpotifyTrack } from "../hooks/useSpotifyTrack";

interface MusicCardProps {
  track: Track;
  index?: number;
}

export default function MusicCard({ track, index = 0 }: MusicCardProps) {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    title,
    artist,
    album,
    userId,
    userAvatar,
    state,
    thumbnailFileId,
    player,
    startTime,
    sessionId,
    audioCodec,
    quality,
    year,
    viewOffset,
    duration,
  } = track;

  const progressPercentage =
    viewOffset && duration ? (viewOffset / duration) * 100 : 0;

  const startedAt = new Date(startTime);
  const currentTime = new Date();
  const remainingMs = duration ? duration - (viewOffset || 0) : 0;
  const estimatedFinishTime = new Date(currentTime.getTime() + remainingMs);

  const { spotifyUrl } = useSpotifyTrack(artist, title);

  const thumbnailUrl = getThumbnailUrl(thumbnailFileId);
  const bgColorClass = "bg-gray-800";

  const timeAgo = getTimeAgo(startedAt);

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formattedDuration = duration
    ? `${Math.floor((duration / 60000) % 60)}:${String(
        Math.floor((duration / 1000) % 60)
      ).padStart(2, "0")}`
    : "0:00";

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
              <motion.div
                variants={imageVariants}
                className="relative w-full h-full"
              >
                <Image
                  src={thumbnailUrl}
                  alt={album || title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className={`object-cover ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onError={() => setImageError(true)}
                  onLoad={() => setImageLoaded(true)}
                  style={{ transition: "opacity 0.3s" }}
                />
              </motion.div>

              {year && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                  {year}
                </div>
              )}

              {spotifyUrl && (
                <a
                  href={spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2 left-2 text-xs px-2 py-1 rounded-full bg-[#1DB954] hover:bg-[#1DB954]/90 text-white shadow-sm shadow-[#1DB954]/30 transition-colors"
                >
                  <div className="flex items-center">
                    <svg
                      className="h-3 w-3 fill-current mr-1"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    <span>Listen</span>
                  </div>
                </a>
              )}
            </div>
          ) : (
            <motion.div
              variants={imageVariants}
              className={`aspect-square ${bgColorClass} flex items-center justify-center p-4 text-center`}
            >
              <span className="text-lg font-bold">{album || title}</span>
            </motion.div>
          )}

          <div
            className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full
              ${
                state === "playing"
                  ? "bg-orange-500 shadow-sm shadow-orange-500/30"
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

        {progressPercentage > 0 && duration && (
          <div className="h-1 w-full bg-gray-800 relative">
            <div
              className="absolute top-0 left-0 h-full bg-orange-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        )}

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

          {audioCodec && (
            <p className="text-gray-400 text-xs mt-2">
              {quality || audioCodec}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              {userAvatar && !avatarError ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src={userAvatar}
                    alt={userId}
                    fill
                    sizes="32px"
                    className="object-cover"
                    onError={() => setAvatarError(true)}
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                  {userId.charAt(0)}
                </div>
              )}
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
              <div>
                <h2 className="text-xl font-bold">{title}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                  <span>{artist}</span>
                  {album && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span>{album}</span>
                    </>
                  )}
                  {year && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span>{year}</span>
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
              {duration && duration > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mb-4 bg-gray-800/50 rounded-lg p-3"
                >
                  <div className="flex justify-between items-center mb-1 text-sm">
                    <span>{Math.round(progressPercentage)}% complete</span>
                    <span>Finishes at {formatTime(estimatedFinishTime)}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </motion.div>
              )}

              {spotifyUrl && (
                <div className="mb-4">
                  <a
                    href={spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#1DB954] hover:bg-[#1DB954]/90 text-white px-3 py-2 rounded-md font-medium text-sm transition-colors"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    <span>Open in Spotify</span>
                  </a>
                </div>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 gap-3"
              >
                <div className="stagger-item stagger-delay-1">
                  <p className="text-gray-400 text-sm">Artist</p>
                  <p>{artist}</p>
                </div>

                <div className="stagger-item stagger-delay-2">
                  <p className="text-gray-400 text-sm">Album</p>
                  <p>
                    {album} {year ? `(${year})` : ""}
                  </p>
                </div>

                {audioCodec && (
                  <div className="stagger-item stagger-delay-3">
                    <p className="text-gray-400 text-sm">Format</p>
                    <p className="uppercase">{audioCodec}</p>
                  </div>
                )}

                {quality && (
                  <div className="stagger-item stagger-delay-4">
                    <p className="text-gray-400 text-sm">Quality</p>
                    <p>{quality}</p>
                  </div>
                )}

                {duration && duration > 0 && (
                  <div className="stagger-item stagger-delay-5">
                    <p className="text-gray-400 text-sm">Duration</p>
                    <p>{formattedDuration}</p>
                  </div>
                )}

                <div className="stagger-item stagger-delay-6">
                  <p className="text-gray-400 text-sm">Device</p>
                  <p>{player}</p>
                </div>

                <div className="stagger-item stagger-delay-7">
                  <p className="text-gray-400 text-sm">User</p>
                  <div className="flex items-center">
                    {userAvatar && !avatarError ? (
                      <div className="relative w-5 h-5 rounded-full overflow-hidden mr-2">
                        <Image
                          src={userAvatar}
                          alt={userId}
                          fill
                          sizes="20px"
                          className="object-cover"
                          onError={() => setAvatarError(true)}
                        />
                      </div>
                    ) : null}
                    <span>{userId}</span>
                  </div>
                </div>

                <div className="stagger-item stagger-delay-8">
                  <p className="text-gray-400 text-sm">Started</p>
                  <p>{startedAt.toLocaleTimeString()}</p>
                </div>

                <div className="stagger-item stagger-delay-9">
                  <p className="text-gray-400 text-sm">Status</p>
                  <p className="capitalize">{state}</p>
                </div>

                <div className="stagger-item stagger-delay-10 col-span-2">
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
