import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Episode } from "../../types/media";
import { getTimeAgo } from "../../utils/dateUtils";
import { getThumbnailUrl } from "../../utils/plexApi";
import {
  calculateProgress,
  calculateFinishTime,
  formatDuration,
  formatQuality,
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

interface TVShowCardProps {
  item: Episode;
  index?: number;
}

export default function TVShowCard({ item, index = 0 }: TVShowCardProps) {
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
    userId,
    userAvatar,
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
    viewOffset,
  } = item;

  const progressPercentage = calculateProgress(viewOffset, duration);
  const startedAt = new Date(startTime);
  const estimatedFinishTime = calculateFinishTime(duration, viewOffset);
  const seasonEpisode = `S${season}:E${episode}`;
  const thumbnailUrl = getThumbnailUrl(thumbnailFileId);
  const bgColorClass = "bg-gray-800";
  const timeAgo = getTimeAgo(startedAt);
  const formattedDuration = formatDuration(duration);
  const qualityFormatted = formatQuality(videoResolution, audioCodec);

  return (
    <motion.div
      ref={cardRef}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardVariants}
      custom={index}
      className="bg-[#1c1c1c] rounded-lg overflow-hidden shadow-md relative col-span-2"
    >
      <div className="cursor-pointer" onClick={toggleDetails}>
        <div className="relative overflow-hidden">
          {thumbnailUrl && !imageError ? (
            <div className="aspect-[16/9] relative">
              {!imageLoaded && <ImageLoadingSpinner />}
              <motion.div
                variants={imageVariants}
                className="relative w-full h-full"
              >
                <Image
                  src={thumbnailUrl}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={`object-cover ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onError={() => setImageError(true)}
                  onLoad={() => setImageLoaded(true)}
                  style={{ transition: "opacity 0.3s" }}
                />
              </motion.div>

              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                {seasonEpisode}
              </div>

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

          <PlayingStateIndicator state={state} />
        </div>

        <ProgressBar percentage={progressPercentage} />

        <div className="p-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold truncate" title={title}>
              {title}
            </h2>
            <p className="text-gray-400 truncate font-medium" title={showTitle}>
              {showTitle}
            </p>

            <div className="mt-2">
              <p className="text-gray-400 text-sm flex items-center gap-2">
                <span>{formattedDuration}</span>
                {qualityFormatted && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span>{qualityFormatted}</span>
                  </>
                )}
              </p>
            </div>
          </div>

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
              style={{ maxHeight: contentMaxHeight }}
            >
              <ProgressInfo
                percentage={progressPercentage}
                estimatedFinishTime={estimatedFinishTime}
              />

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
                    <p>{qualityFormatted}</p>
                  </div>
                )}
                <div className="stagger-item stagger-delay-4">
                  <p className="text-gray-400 text-sm">Duration</p>
                  <p>{formattedDuration}</p>
                </div>
                <div className="stagger-item stagger-delay-5">
                  <p className="text-gray-400 text-sm">Device</p>
                  <p>{player}</p>
                </div>
                <div className="stagger-item stagger-delay-6">
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
                <div className="stagger-item stagger-delay-7">
                  <p className="text-gray-400 text-sm">Started</p>
                  <p>{startedAt.toLocaleTimeString()}</p>
                </div>
                <div className="stagger-item stagger-delay-8">
                  <p className="text-gray-400 text-sm">Status</p>
                  <p className="capitalize">{state}</p>
                </div>
                <div className="stagger-item stagger-delay-9 col-span-2">
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
