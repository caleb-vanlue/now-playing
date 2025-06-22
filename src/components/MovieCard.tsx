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
  getRatingSource,
  formatAudioChannels,
} from "../../utils/mediaCardUtils";
import { BaseMediaCard, ImageState } from "./BaseMediaCard";
import { ProgressInfo } from "./CardComponents";
import { UserAvatar } from "./UserAvatar";
import {
  ContentRatingBadge,
  TranscodeStatusBadge,
  ImageWithFallback,
} from "./ImageWithFallback";

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
  const qualityFormatted = formatQuality(
    movie.videoResolution,
    movie.audioCodec
  );
  const formattedDuration = formatDuration(movie.duration);
  const startedAt = new Date(movie.startTime);

  const renderThumbnail = (movie: Movie, imageState: ImageState) => {
    const thumbnailUrl = getThumbnailUrl(movie.thumbnailFileId);

    const badges = [];

    if (movie.contentRating) {
      badges.push(<ContentRatingBadge rating={movie.contentRating} />);
    }

    if (movie.videoDecision) {
      badges.push(
        <TranscodeStatusBadge
          videoDecision={movie.videoDecision}
          audioDecision={movie.audioDecision}
        />
      );
    }

    return (
      <ImageWithFallback
        src={thumbnailUrl}
        alt={movie.title}
        aspectRatio="portrait"
        sizes="(max-width: 768px) 100vw, 33vw"
        fallbackIcon="🎬"
        badges={badges}
        onLoad={() => imageState.setImageLoaded(true)}
      />
    );
  };

  const renderMainContent = (movie: Movie) => (
    <>
      <h3 className="text-xl font-bold truncate" title={movie.title}>
        {movie.title}
      </h3>
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
          {movie.rating && (
            <>
              <span className="text-gray-600">•</span>
              <span>⭐ {movie.rating}/10</span>
            </>
          )}
        </p>
      </div>
    </>
  );

  const renderDetailHeader = (movie: Movie) => (
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
        {(movie.genre?.length ?? 0) > 0 && (
          <>
            <span className="text-gray-600">•</span>
            <span>{movie.genre?.slice(0, 2).join(", ")}</span>
          </>
        )}
      </div>
      {movie.tagline && (
        <p className="text-gray-500 italic text-sm mt-1">{movie.tagline}</p>
      )}
    </div>
  );

  const renderDetailContent = (movie: Movie) => (
    <>
      <ProgressInfo
        percentage={progressPercentage}
        estimatedFinishTime={estimatedFinishTime}
      />

      {movie.transcodeProgress !== undefined &&
        (movie.videoDecision === "transcode" ||
          movie.audioDecision === "transcode") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4 bg-gray-800/50 rounded-lg p-3"
          >
            <div className="flex justify-between items-center mb-1 text-sm">
              <span>
                {movie.videoDecision === "transcode" &&
                movie.audioDecision === "transcode"
                  ? "Transcode Progress"
                  : movie.videoDecision === "transcode"
                  ? "Video Transcode Progress"
                  : "Audio Transcode Progress"}
              </span>
              <span>{Math.round(movie.transcodeProgress)}%</span>
            </div>
            <div 
              className="w-full h-2 bg-gray-700 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(movie.transcodeProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Transcode progress"
            >
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${movie.transcodeProgress}%` }}
              ></div>
            </div>
          </motion.div>
        )}

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
        {movie.director && (
          <div className="stagger-item stagger-delay-2">
            <p className="text-gray-400 text-sm">Director</p>
            <p>{movie.director}</p>
          </div>
        )}
        {movie.videoResolution && (
          <div className="stagger-item stagger-delay-3">
            <p className="text-gray-400 text-sm">Video Quality</p>
            <p>{qualityFormatted}</p>
          </div>
        )}
        {movie.videoCodec && (
          <div className="stagger-item stagger-delay-4">
            <p className="text-gray-400 text-sm">Video Format</p>
            <p className="uppercase">
              {movie.videoCodec}{" "}
              {movie.videoProfile ? `(${movie.videoProfile})` : ""}
            </p>
          </div>
        )}
        {movie.audioCodec && (
          <div className="stagger-item stagger-delay-5">
            <p className="text-gray-400 text-sm">Audio Format</p>
            <p className="uppercase">
              {movie.audioCodec}{" "}
              {movie.audioChannels
                ? formatAudioChannels(
                    movie.audioChannels,
                    movie.audioChannelLayout
                  )
                : ""}
            </p>
          </div>
        )}
        {movie.bitrate && (
          <div className="stagger-item stagger-delay-6">
            <p className="text-gray-400 text-sm">Bitrate</p>
            <p>{(movie.bitrate / 1000).toFixed(1)} Mbps</p>
          </div>
        )}
        <div className="stagger-item stagger-delay-7">
          <p className="text-gray-400 text-sm">Playback Type</p>
          <p>
            {movie.videoDecision === "copy" && movie.audioDecision === "copy"
              ? "Direct Play"
              : movie.videoDecision === "transcode" &&
                movie.audioDecision === "transcode"
              ? "Full Transcode"
              : movie.videoDecision === "transcode"
              ? "Video Transcode"
              : movie.audioDecision === "transcode"
              ? "Audio Transcode"
              : "Direct Play"}
            {movie.transcodeHwRequested && " (HW)"}
          </p>
        </div>
        <div className="stagger-item stagger-delay-8">
          <p className="text-gray-400 text-sm">Connection</p>
          <p>
            {movie.location?.toUpperCase() || "Unknown"}
            {movie.secure && " • Secure"}
            {movie.local && " • Local"}
          </p>
        </div>
        <div className="stagger-item stagger-delay-9">
          <p className="text-gray-400 text-sm">Bandwidth</p>
          <p>
            {movie.bandwidth
              ? `${(movie.bandwidth / 1000).toFixed(1)} Mbps`
              : "N/A"}
          </p>
        </div>
        <div className="stagger-item stagger-delay-10">
          <p className="text-gray-400 text-sm">Platform</p>
          <p>
            {movie.platform} {movie.platformVersion}
          </p>
        </div>
        <div className="stagger-item stagger-delay-11">
          <p className="text-gray-400 text-sm">Device</p>
          <p>{movie.device || movie.player}</p>
        </div>
        <div className="stagger-item stagger-delay-12">
          <p className="text-gray-400 text-sm">Player Version</p>
          <p className="text-xs truncate">
            {movie.playerVersion || movie.product}
          </p>
        </div>
        <div className="stagger-item stagger-delay-13">
          <p className="text-gray-400 text-sm">User</p>
          <div className="flex items-center">
            <UserAvatar
              userId={movie.userId}
              userAvatar={movie.userAvatar}
              avatarError={false}
              onAvatarError={() => {}}
              size="medium"
            />
            <span className="ml-2">{movie.userId}</span>
          </div>
        </div>
        <div className="stagger-item stagger-delay-14">
          <p className="text-gray-400 text-sm">Started</p>
          <p>
            <time dateTime={startedAt.toISOString()}>
              {startedAt.toLocaleTimeString()}
            </time>
          </p>
        </div>
        <div className="stagger-item stagger-delay-15">
          <p className="text-gray-400 text-sm">Status</p>
          <p className="capitalize">{movie.state}</p>
        </div>
        <div className="stagger-item stagger-delay-16 col-span-2">
          <p className="text-gray-400 text-sm">Session ID</p>
          <p className="font-mono text-xs">{movie.sessionId}</p>
        </div>
      </motion.div>

      {movie.genre && movie.genre.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4"
        >
          <p className="text-gray-400 text-sm mb-2">Genres</p>
          <div className="flex flex-wrap gap-2">
            {movie.genre.map((g, i) => (
              <span
                key={i}
                className="bg-gray-800 px-2 py-1 rounded-md text-xs"
              >
                {g}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {movie.ratings && movie.ratings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4"
        >
          <p className="text-gray-400 text-sm mb-2">Ratings</p>
          <div className="flex flex-wrap gap-3">
            {movie.ratings.map((rating, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {getRatingSource(rating)}:
                </span>
                <span className="text-sm font-medium">{rating.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {movie.actors && movie.actors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4"
        >
          <p className="text-gray-400 text-sm mb-2">Cast</p>
          <div className="grid grid-cols-2 gap-3">
            {movie.actors.slice(0, 6).map((actor, i) => (
              <div key={i} className="flex items-center gap-3">
                {actor.thumb ? (
                  <Image
                    src={actor.thumb}
                    alt={actor.tag}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300">
                    {actor.tag
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <div className="text-xs">
                  <p className="font-medium">{actor.tag}</p>
                  {actor.role && <p className="text-gray-500">{actor.role}</p>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {movie.directors && movie.directors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-4"
        >
          <p className="text-gray-400 text-sm mb-1">Directors</p>
          <p className="text-sm">
            {movie.directors.map((d) => d.tag).join(", ")}
          </p>
        </motion.div>
      )}

      {movie.writers && movie.writers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-4"
        >
          <p className="text-gray-400 text-sm mb-1">Writers</p>
          <p className="text-sm">
            {movie.writers.map((w) => w.tag).join(", ")}
          </p>
        </motion.div>
      )}
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
