import React, { memo } from "react";
import { motion } from "framer-motion";
import { Episode } from "../../types/media";
import { useRelatedItems } from "../hooks/useRelatedItems";
import { RelatedCarousel } from "./RelatedCarousel";
import { getResponsiveThumbnailUrl, getSeriesThumbnailUrl } from "../../utils/api";
import {
  calculateProgress,
  calculateFinishTime,
  formatDuration,
  formatQuality,
  getBestDisplayRating,
  formatAudioChannels,
} from "../../utils/mediaCardUtils";
import { getRatingIcon } from "../../utils/ratingIcons";
import { BaseMediaCard, ImageState } from "./BaseMediaCard";
import {
  ProgressInfo,
  SummarySection,
  RatingsSection,
  CastGrid,
  GenresSection,
  WritersSection,
} from "./CardComponents";
import { SelfContainedUserAvatar } from "./UserAvatar";
import {
  SeasonEpisodeBadge,
  ContentRatingBadge,
  TranscodeStatusBadge,
  ImageWithFallback,
} from "./ImageWithFallback";

function TVShowDetailContent({ episode }: { episode: Episode }) {
  const { items: related, loading: relatedLoading } = useRelatedItems(episode);
  const progressPercentage = calculateProgress(episode.viewOffset, episode.duration);
  const estimatedFinishTime = calculateFinishTime(episode.duration, episode.viewOffset);
  const qualityFormatted = formatQuality(episode.videoResolution, episode.audioCodec);
  const formattedDuration = formatDuration(episode.duration);
  const seasonEpisode = `S${episode.season}:E${episode.episode}`;
  const startedAt = new Date(episode.startTime);

  return (
    <>
      <ProgressInfo
        percentage={progressPercentage}
        estimatedFinishTime={estimatedFinishTime}
        transcodeProgress={
          episode.transcodeProgress !== undefined &&
          (episode.videoDecision === "transcode" || episode.audioDecision === "transcode")
            ? episode.transcodeProgress
            : undefined
        }
      />

      <SummarySection summary={episode.summary} />
      <RatingsSection ratings={episode.ratings} />
      <CastGrid actors={episode.actors} />
      <GenresSection genres={episode.genre} />

      <RelatedCarousel items={related} loading={relatedLoading} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 gap-3 mt-4"
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
              {episode.audioChannels
                ? formatAudioChannels(episode.audioChannels, episode.audioChannelLayout)
                : ""}
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
            {episode.videoDecision === "copy" && episode.audioDecision === "copy"
              ? "Direct Play"
              : episode.videoDecision === "transcode" && episode.audioDecision === "transcode"
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
          <p className="text-gray-400 text-sm">Device</p>
          <p>{episode.player}</p>
        </div>
        <div className="stagger-item stagger-delay-10">
          <p className="text-gray-400 text-sm">User</p>
          <div className="flex items-center">
            <SelfContainedUserAvatar userId={episode.userId} userAvatar={episode.userAvatar} size="medium" />
            <span className="ml-2">{episode.userId}</span>
          </div>
        </div>
        <div className="stagger-item stagger-delay-15">
          <p className="text-gray-400 text-sm">Started</p>
          <p>
            <time dateTime={startedAt.toISOString()}>{startedAt.toLocaleTimeString()}</time>
          </p>
        </div>
        <div className="stagger-item stagger-delay-16">
          <p className="text-gray-400 text-sm">Status</p>
          <p className="capitalize">{episode.state}</p>
        </div>
      </motion.div>

      <WritersSection writers={episode.writers} />
    </>
  );
}

interface TVShowCardProps {
  item: Episode;
  index?: number;
  showSeriesPoster?: boolean;
}

function TVShowCard({
  item: episode,
  index = 0,
  showSeriesPoster = false,
}: TVShowCardProps) {
  const progressPercentage = calculateProgress(
    episode.viewOffset,
    episode.duration,
  );
  const estimatedFinishTime = calculateFinishTime(
    episode.duration,
    episode.viewOffset,
  );
  const seasonEpisode = `S${episode.season}:E${episode.episode}`;
  const formattedDuration = formatDuration(episode.duration);
  const qualityFormatted = formatQuality(
    episode.videoResolution,
    episode.audioCodec,
  );
  const startedAt = new Date(episode.startTime);

  const renderThumbnail = (episode: Episode, imageState: ImageState) => {
    const seriesUrl = showSeriesPoster ? getSeriesThumbnailUrl(episode) : null;
    const thumbnailUrl = seriesUrl ?? getResponsiveThumbnailUrl(episode, "tv");

    const badges = [
      <SeasonEpisodeBadge
        key="season-episode"
        season={episode.season}
        episode={episode.episode}
      />,
    ];

    if (episode.contentRating) {
      badges.push(<ContentRatingBadge rating={episode.contentRating} />);
    }

    if (episode.videoDecision) {
      badges.push(
        <TranscodeStatusBadge
          videoDecision={episode.videoDecision}
          audioDecision={episode.audioDecision}
        />,
      );
    }

    return (
      <ImageWithFallback
        src={thumbnailUrl}
        alt={episode.showTitle}
        aspectRatio={showSeriesPoster ? "portrait" : "landscape"}
        sizes="(max-width: 768px) 100vw, 50vw"
        fallbackIcon="📺"
        badges={badges}
        onLoad={() => imageState.setImageLoaded(true)}
      />
    );
  };

  const renderMainContent = (episode: Episode) => {
    const bestRating = getBestDisplayRating(episode.ratings, episode.rating);
    return (
      <div className="flex flex-col">
        <h3 className="text-xl font-bold truncate" title={episode.title}>
          {episode.title}
        </h3>
        <p
          className="text-gray-400 truncate font-medium"
          title={episode.showTitle}
        >
          {episode.showTitle}
        </p>
        <div className="mt-1">
          <p className="text-gray-400 text-sm flex items-center gap-2">
            <span>{formattedDuration}</span>
            {qualityFormatted && (
              <>
                <span className="text-gray-600">•</span>
                <span>{qualityFormatted}</span>
              </>
            )}
            {bestRating && (
              <>
                <span className="text-gray-600">•</span>
                <span className="flex items-center gap-1">
                  {getRatingIcon(bestRating)}
                  {bestRating.value}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    );
  };

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

  const renderDetailContent = (episode: Episode) => <TVShowDetailContent episode={episode} />;

  const isTranscoding =
    episode.transcodeProgress !== undefined &&
    (episode.videoDecision === "transcode" || episode.audioDecision === "transcode");

  return (
    <BaseMediaCard
      item={episode}
      index={index}
      renderThumbnail={renderThumbnail}
      renderMainContent={renderMainContent}
      renderDetailHeader={renderDetailHeader}
      renderDetailContent={renderDetailContent}
      progressPercentage={progressPercentage}
      transcodeProgress={isTranscoding ? episode.transcodeProgress : undefined}
      className={showSeriesPoster ? "" : "col-span-2"}
    />
  );
}

export default memo(TVShowCard);
