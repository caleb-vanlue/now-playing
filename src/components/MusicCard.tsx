import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Track } from "../../types/media";
import { getThumbnailUrl } from "../../utils/api";
import { getTimeAgo } from "../../utils/dateUtils";
import { useSpotifyTrack } from "../hooks/useSpotifyTrack";
import {
  calculateProgress,
  calculateFinishTime,
  formatDurationMMSS,
  cardVariants,
  imageVariants,
} from "../../utils/mediaCardUtils";
import { useMediaCard } from "../hooks/useMediaCard";
import {
  ImageLoadingSpinner,
  PlayingStateIndicator,
  ProgressBar,
  ProgressInfo,
} from "./CardComponents";
import { UserInfo, UserAvatar } from "./UserAvatar";

interface MusicCardProps {
  track: Track;
  index?: number;
}

export default function MusicCard({ track, index = 0 }: MusicCardProps) {
  const {
    showDetails,
    imageError,
    imageLoaded,
    avatarError,
    cardRef,
    headerRef,
    contentMaxHeight,
    toggleDetails,
    setImageError,
    setImageLoaded,
    setAvatarError,
  } = useMediaCard();

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

  const progressPercentage = calculateProgress(viewOffset, duration);
  const startedAt = new Date(startTime);
  const estimatedFinishTime = duration
    ? calculateFinishTime(duration, viewOffset)
    : new Date();

  const { spotifyUrl } = useSpotifyTrack(artist, title);
  const thumbnailUrl = getThumbnailUrl(thumbnailFileId);
  const bgColorClass = "bg-gray-800";
  const timeAgo = getTimeAgo(startedAt);
  const formattedDuration = duration ? formatDurationMMSS(duration) : "0:00";

  return (
    <motion.div
      ref={cardRef}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardVariants}
      custom={index}
      className="bg-[#1c1c1c] rounded-lg overflow-hidden shadow-md relative"
    >
      <div className="cursor-pointer" onClick={toggleDetails}>
        <div className="relative overflow-hidden">
          {thumbnailUrl && !imageError ? (
            <div className="aspect-[1] relative">
              {!imageLoaded && <ImageLoadingSpinner />}
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
                    <Image
                      src="/images/logos/Primary_Logo_White_CMYK.svg"
                      alt="Spotify"
                      width={12}
                      height={12}
                      className="mr-1"
                    />
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

          <PlayingStateIndicator state={state} />
        </div>

        <ProgressBar percentage={progressPercentage} />

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

          <UserInfo
            userId={userId}
            userAvatar={userAvatar}
            avatarError={avatarError}
            onAvatarError={() => setAvatarError(true)}
            timeAgo={timeAgo}
          />
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
              ref={headerRef}
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
              style={{ maxHeight: contentMaxHeight }}
            >
              {duration && duration > 0 && (
                <ProgressInfo
                  percentage={progressPercentage}
                  estimatedFinishTime={estimatedFinishTime}
                />
              )}

              {spotifyUrl && (
                <div className="mb-4">
                  <a
                    href={spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#1DB954] hover:bg-[#1DB954]/90 text-white px-3 py-2 rounded-md font-medium text-sm transition-colors"
                  >
                    <Image
                      src="/images/logos/Primary_Logo_White_CMYK.svg"
                      alt="Spotify"
                      width={16}
                      height={16}
                      className="fill-current"
                    />
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
                    <UserAvatar
                      userId={userId}
                      userAvatar={userAvatar}
                      avatarError={avatarError}
                      onAvatarError={() => setAvatarError(true)}
                      size="small"
                    />
                    <span className="ml-2">{userId}</span>
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
