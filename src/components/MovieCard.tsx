import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Movie } from "../../types/media";
import { getThumbnailUrl } from "../../utils/api";
import {
  calculateProgress,
  calculateFinishTime,
  formatDuration,
  formatQuality,
  imageVariants,
} from "../../utils/mediaCardUtils";
import { BaseMediaCard, ImageState } from "./BaseMediaCard";
import { ImageLoadingSpinner, ProgressInfo } from "./CardComponents";
import { UserAvatar } from "./UserAvatar";

interface MovieCardProps {
  item: Movie;
  index?: number;
}

export default function MovieCard({ item: movie, index = 0 }: MovieCardProps) {
  const progressPercentage = calculateProgress(
    movie.viewOffset,
    movie.duration
  );
  const estimatedFinishTime = calculateFinishTime(
    movie.duration,
    movie.viewOffset
  );
  const thumbnailUrl = getThumbnailUrl(movie.thumbnailFileId);
  const qualityFormatted = formatQuality(
    movie.videoResolution,
    movie.audioCodec
  );
  const formattedDuration = formatDuration(movie.duration);
  const startedAt = new Date(movie.startTime);

  const renderThumbnail = (_: Movie, imageState: ImageState) => {
    if (thumbnailUrl && !imageState.imageError) {
      return (
        <div className="aspect-[2/3] relative">
          {!imageState.imageLoaded && <ImageLoadingSpinner />}
          <motion.div
            variants={imageVariants}
            className="relative w-full h-full"
          >
            <Image
              src={thumbnailUrl}
              alt={movie.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className={`object-cover ${
                imageState.imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onError={() => imageState.setImageError(true)}
              onLoad={() => imageState.setImageLoaded(true)}
              style={{ transition: "opacity 0.3s" }}
            />
          </motion.div>

          {movie.contentRating && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
              {movie.contentRating}
            </div>
          )}
        </div>
      );
    }

    return (
      <motion.div
        variants={imageVariants}
        className="aspect-[2/3] bg-gray-800 flex items-center justify-center p-4 text-center"
      >
        <span className="text-lg font-bold">{movie.title}</span>
      </motion.div>
    );
  };

  const renderMainContent = (_: Movie) => (
    <>
      <h2 className="text-xl font-bold truncate" title={movie.title}>
        {movie.title}
      </h2>
      <p>{movie.year}</p>
      <div className="mt-1">
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
    </>
  );

  const renderDetailHeader = (_: Movie) => (
    <div>
      <h2 className="text-xl font-bold">{movie.title}</h2>
      <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
        <span>{movie.year}</span>
        {movie.contentRating && (
          <>
            <span className="text-gray-600">•</span>
            <span>{movie.contentRating}</span>
          </>
        )}
        <span className="text-gray-600">•</span>
        <span>{formattedDuration}</span>
      </div>
    </div>
  );

  const renderDetailContent = (_: Movie) => (
    <>
      <ProgressInfo
        percentage={progressPercentage}
        estimatedFinishTime={estimatedFinishTime}
      />

      {movie.summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <p className="text-gray-400 text-sm">Summary</p>
          <p className="text-sm leading-tight">{movie.summary}</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-3"
      >
        {movie.studio && (
          <div className="stagger-item stagger-delay-1">
            <p className="text-gray-400 text-sm">Studio</p>
            <p>{movie.studio}</p>
          </div>
        )}
        {movie.videoResolution && (
          <div className="stagger-item stagger-delay-2">
            <p className="text-gray-400 text-sm">Quality</p>
            <p>{qualityFormatted}</p>
          </div>
        )}
        <div className="stagger-item stagger-delay-3">
          <p className="text-gray-400 text-sm">Device</p>
          <p>{movie.player}</p>
        </div>
        <div className="stagger-item stagger-delay-4">
          <p className="text-gray-400 text-sm">User</p>
          <div className="flex items-center">
            <UserAvatar
              userId={movie.userId}
              userAvatar={movie.userAvatar}
              avatarError={false}
              onAvatarError={() => {}}
              size="small"
            />
            <span className="ml-2">{movie.userId}</span>
          </div>
        </div>
        <div className="stagger-item stagger-delay-5">
          <p className="text-gray-400 text-sm">Started</p>
          <p>{startedAt.toLocaleTimeString()}</p>
        </div>
        <div className="stagger-item stagger-delay-6">
          <p className="text-gray-400 text-sm">Status</p>
          <p className="capitalize">{movie.state}</p>
        </div>
        <div className="stagger-item stagger-delay-7 col-span-2">
          <p className="text-gray-400 text-sm">Session ID</p>
          <p className="font-mono text-xs">{movie.sessionId}</p>
        </div>
      </motion.div>
    </>
  );

  return (
    <BaseMediaCard
      item={movie}
      index={index}
      renderThumbnail={renderThumbnail}
      renderMainContent={renderMainContent}
      renderDetailHeader={renderDetailHeader}
      renderDetailContent={renderDetailContent}
      progressPercentage={progressPercentage}
    />
  );
}
