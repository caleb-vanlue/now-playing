import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Episode } from "../../types/media";
import { getThumbnailUrl } from "../../utils/plexApi";
import {
  calculateProgress,
  calculateFinishTime,
  formatDuration,
  formatQuality,
  getRatingSource,
} from "../../utils/mediaCardUtils";
import { BaseMediaCard, ImageState } from "./BaseMediaCard";
import { ImageLoadingSpinner, ProgressInfo } from "./CardComponents";
import { UserAvatar } from "./UserAvatar";
import {
  SeasonEpisodeBadge,
  ContentRatingBadge,
  TranscodeStatusBadge,
  ImageWithFallback,
} from "./ImageWithFallback";

interface TVShowCardProps {
  item: Episode;
  index?: number;
}

export default function TVShowCard({
  item: episode,
  index = 0,
}: TVShowCardProps) {
  const progressPercentage = calculateProgress(
    episode.viewOffset,
    episode.duration
  );
  const estimatedFinishTime = calculateFinishTime(
    episode.duration,
    episode.viewOffset
  );
  const seasonEpisode = `S${episode.season}:E${episode.episode}`;
  const thumbnailUrl = getThumbnailUrl(episode.thumbnailFileId);
  const formattedDuration = formatDuration(episode.duration);
  const qualityFormatted = formatQuality(
    episode.videoResolution,
    episode.audioCodec
  );
  const startedAt = new Date(episode.startTime);

  const renderThumbnail = (episode: Episode, imageState: ImageState) => {
    const thumbnailUrl = getThumbnailUrl(episode.thumbnailFileId);
    const seasonEpisode = `S${episode.season}:E${episode.episode}`;

    const badges = [
      <SeasonEpisodeBadge season={episode.season} episode={episode.episode} />,
    ];

    if (episode.contentRating) {
      badges.push(<ContentRatingBadge rating={episode.contentRating} />);
    }

    if (episode.videoDecision) {
      badges.push(
        <TranscodeStatusBadge
          videoDecision={episode.videoDecision}
          audioDecision={episode.audioDecision}
        />
      );
    }

    return (
      <ImageWithFallback
        src={thumbnailUrl}
        alt={episode.title}
        aspectRatio="landscape"
        sizes="(max-width: 768px) 100vw, 50vw"
        fallbackIcon="📺"
        badges={badges}
        onLoad={() => imageState.setImageLoaded(true)}
      />
    );
  };

  const renderMainContent = (episode: Episode) => (
    <div className="flex flex-col">
      <h2 className="text-xl font-bold truncate" title={episode.title}>
        {episode.title}
      </h2>
      <p
        className="text-gray-400 truncate font-medium"
        title={episode.showTitle}
      >
        {episode.showTitle}
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
          {episode.rating && (
            <>
              <span className="text-gray-600">•</span>
              <span>⭐ {episode.rating}/10</span>
            </>
          )}
        </p>
      </div>
    </div>
  );

  const renderDetailHeader = (episode: Episode) => (
    <div>
      <h2 className="text-xl font-bold">{episode.title}</h2>
      <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
        <span>{episode.showTitle}</span>
        <span className="text-gray-600">•</span>
        <span>{seasonEpisode}</span>
        {episode.contentRating && (
          <>
            <span className="text-gray-600">•</span>
            <span>{episode.contentRating}</span>
          </>
        )}
      </div>
    </div>
  );

  const renderDetailContent = (episode: Episode) => (
    <>
      <ProgressInfo
        percentage={progressPercentage}
        estimatedFinishTime={estimatedFinishTime}
      />

      {episode.transcodeProgress !== undefined &&
        (episode.videoDecision === "transcode" ||
          episode.audioDecision === "transcode") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4 bg-gray-800/50 rounded-lg p-3"
          >
            <div className="flex justify-between items-center mb-1 text-sm">
              <span>
                {episode.videoDecision === "transcode" &&
                episode.audioDecision === "transcode"
                  ? "Transcode Progress"
                  : episode.videoDecision === "transcode"
                  ? "Video Transcode Progress"
                  : "Audio Transcode Progress"}
              </span>
              <span>{Math.round(episode.transcodeProgress)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${episode.transcodeProgress}%` }}
              ></div>
            </div>
          </motion.div>
        )}

      {episode.summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <p className="text-gray-400 text-sm">Summary</p>
          <p className="text-sm leading-tight">{episode.summary}</p>
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
          <p>{episode.showTitle}</p>
        </div>
        <div className="stagger-item stagger-delay-2">
          <p className="text-gray-400 text-sm">Episode</p>
          <p>{seasonEpisode}</p>
        </div>
        {episode.videoResolution && (
          <div className="stagger-item stagger-delay-3">
            <p className="text-gray-400 text-sm">Video Quality</p>
            <p>{qualityFormatted}</p>
          </div>
        )}
        {episode.videoCodec && (
          <div className="stagger-item stagger-delay-4">
            <p className="text-gray-400 text-sm">Video Format</p>
            <p className="uppercase">
              {episode.videoCodec}{" "}
              {episode.videoProfile ? `(${episode.videoProfile})` : ""}
            </p>
          </div>
        )}
        {episode.audioCodec && (
          <div className="stagger-item stagger-delay-5">
            <p className="text-gray-400 text-sm">Audio Format</p>
            <p className="uppercase">
              {episode.audioCodec}{" "}
              {episode.audioChannels ? `${episode.audioChannels}.1` : ""}
            </p>
          </div>
        )}
        <div className="stagger-item stagger-delay-6">
          <p className="text-gray-400 text-sm">Duration</p>
          <p>{formattedDuration}</p>
        </div>
        {episode.bitrate && (
          <div className="stagger-item stagger-delay-7">
            <p className="text-gray-400 text-sm">Bitrate</p>
            <p>{(episode.bitrate / 1000).toFixed(1)} Mbps</p>
          </div>
        )}
        <div className="stagger-item stagger-delay-8">
          <p className="text-gray-400 text-sm">Playback Type</p>
          <p>
            {episode.videoDecision === "copy" &&
            episode.audioDecision === "copy"
              ? "Direct Play"
              : episode.videoDecision === "transcode" &&
                episode.audioDecision === "transcode"
              ? "Full Transcode"
              : episode.videoDecision === "transcode"
              ? "Video Transcode"
              : episode.audioDecision === "transcode"
              ? "Audio Transcode"
              : "Direct Play"}
            {episode.transcodeHwRequested && " (HW)"}
          </p>
        </div>
        <div className="stagger-item stagger-delay-9">
          <p className="text-gray-400 text-sm">Connection</p>
          <p>
            {episode.location?.toUpperCase() || "Unknown"}
            {episode.secure && " • Secure"}
            {episode.local && " • Local"}
          </p>
        </div>
        <div className="stagger-item stagger-delay-10">
          <p className="text-gray-400 text-sm">Bandwidth</p>
          <p>
            {episode.bandwidth
              ? `${(episode.bandwidth / 1000).toFixed(1)} Mbps`
              : "N/A"}
          </p>
        </div>
        <div className="stagger-item stagger-delay-11">
          <p className="text-gray-400 text-sm">Platform</p>
          <p>
            {episode.platform} {episode.platformVersion}
          </p>
        </div>
        <div className="stagger-item stagger-delay-12">
          <p className="text-gray-400 text-sm">Device</p>
          <p>{episode.device || episode.player}</p>
        </div>
        <div className="stagger-item stagger-delay-13">
          <p className="text-gray-400 text-sm">Player Version</p>
          <p className="text-xs truncate">
            {episode.playerVersion || episode.product}
          </p>
        </div>
        <div className="stagger-item stagger-delay-14">
          <p className="text-gray-400 text-sm">User</p>
          <div className="flex items-center">
            <UserAvatar
              userId={episode.userId}
              userAvatar={episode.userAvatar}
              avatarError={false}
              onAvatarError={() => {}}
              size="medium"
            />
            <span className="ml-2">{episode.userId}</span>
          </div>
        </div>
        <div className="stagger-item stagger-delay-15">
          <p className="text-gray-400 text-sm">Started</p>
          <p>{startedAt.toLocaleTimeString()}</p>
        </div>
        <div className="stagger-item stagger-delay-16">
          <p className="text-gray-400 text-sm">Status</p>
          <p className="capitalize">{episode.state}</p>
        </div>
        <div className="stagger-item stagger-delay-17 col-span-2">
          <p className="text-gray-400 text-sm">Session ID</p>
          <p className="font-mono text-xs">{episode.sessionId}</p>
        </div>
      </motion.div>

      {episode.genre && episode.genre.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4"
        >
          <p className="text-gray-400 text-sm mb-2">Genres</p>
          <div className="flex flex-wrap gap-2">
            {episode.genre.map((g, i) => (
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

      {episode.ratings && episode.ratings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4"
        >
          <p className="text-gray-400 text-sm mb-2">Ratings</p>
          <div className="flex flex-wrap gap-3">
            {episode.ratings.map((rating, i) => (
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

      {episode.actors && episode.actors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4"
        >
          <p className="text-gray-400 text-sm mb-2">Cast</p>
          <div className="grid grid-cols-2 gap-3">
            {episode.actors.slice(0, 6).map((actor, i) => (
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

      {episode.directors && episode.directors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-4"
        >
          <p className="text-gray-400 text-sm mb-1">Directors</p>
          <p className="text-sm">
            {episode.directors.map((d) => d.tag).join(", ")}
          </p>
        </motion.div>
      )}

      {episode.writers && episode.writers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-4"
        >
          <p className="text-gray-400 text-sm mb-1">Writers</p>
          <p className="text-sm">
            {episode.writers.map((w) => w.tag).join(", ")}
          </p>
        </motion.div>
      )}
    </>
  );

  return (
    <BaseMediaCard
      item={episode}
      index={index}
      renderThumbnail={renderThumbnail}
      renderMainContent={renderMainContent}
      renderDetailHeader={renderDetailHeader}
      renderDetailContent={renderDetailContent}
      progressPercentage={progressPercentage}
      className="col-span-2"
    />
  );
}
