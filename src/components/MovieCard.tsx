import React, { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Movie } from "../../types/media";
import { getResponsiveThumbnailUrl, getMovieBackdropUrl } from "../../utils/api";
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
  ContentRatingBadge,
  TranscodeStatusBadge,
  ImageWithFallback,
} from "./ImageWithFallback";
import { useRelatedItems } from "../hooks/useRelatedItems";
import { RelatedCarousel } from "./RelatedCarousel";

function MovieDetailContent({ movie }: { movie: Movie }) {
  const { items: related, loading: relatedLoading } = useRelatedItems(movie);
  const progressPercentage = calculateProgress(movie.viewOffset, movie.duration);
  const estimatedFinishTime = calculateFinishTime(movie.duration, movie.viewOffset);
  const qualityFormatted = formatQuality(movie.videoResolution, movie.audioCodec);
  const startedAt = new Date(movie.startTime);

  return (
    <>
      <ProgressInfo
        percentage={progressPercentage}
        estimatedFinishTime={estimatedFinishTime}
        transcodeProgress={
          movie.transcodeProgress !== undefined &&
          (movie.videoDecision === "transcode" || movie.audioDecision === "transcode")
            ? movie.transcodeProgress
            : undefined
        }
      />

      <SummarySection summary={movie.summary} />
      <RatingsSection ratings={movie.ratings} />
      <CastGrid actors={movie.actors} />
      <GenresSection genres={movie.genre} />

      <RelatedCarousel items={related} loading={relatedLoading} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 gap-3 mt-4"
      >
        {movie.studio && (
          <div className="stagger-item stagger-delay-1 min-w-0">
            <p className="text-gray-400 text-sm">Studio</p>
            <p className="break-words">{movie.studio}</p>
          </div>
        )}
        {movie.director && (
          <div className="stagger-item stagger-delay-2 min-w-0">
            <p className="text-gray-400 text-sm">Director</p>
            <p className="break-words">{movie.director}</p>
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
                ? formatAudioChannels(movie.audioChannels, movie.audioChannelLayout)
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
              : movie.videoDecision === "transcode" && movie.audioDecision === "transcode"
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
          <p className="text-gray-400 text-sm">Device</p>
          <p>{movie.player}</p>
        </div>
        <div className="stagger-item stagger-delay-9">
          <p className="text-gray-400 text-sm">User</p>
          <div className="flex items-center">
            <SelfContainedUserAvatar userId={movie.userId} userAvatar={movie.userAvatar} size="medium" />
            <span className="ml-2">{movie.userId}</span>
          </div>
        </div>
        <div className="stagger-item stagger-delay-14">
          <p className="text-gray-400 text-sm">Started</p>
          <p>
            <time dateTime={startedAt.toISOString()}>{startedAt.toLocaleTimeString()}</time>
          </p>
        </div>
        <div className="stagger-item stagger-delay-15">
          <p className="text-gray-400 text-sm">Status</p>
          <p className="capitalize">{movie.state}</p>
        </div>
      </motion.div>

      <WritersSection writers={movie.writers} />
    </>
  );
}

interface MovieCardProps {
  item: Movie;
  index?: number;
  showBackdrop?: boolean;
}

function MovieCard({ item: movie, index = 0, showBackdrop = false }: MovieCardProps) {
  const progressPercentage = calculateProgress(movie.viewOffset, movie.duration);

  const renderThumbnail = useCallback(
    (movie: Movie, imageState: ImageState) => {
      const backdropUrl = showBackdrop ? getMovieBackdropUrl(movie) : null;
      const thumbnailUrl = backdropUrl ?? getResponsiveThumbnailUrl(movie, "movie");

      const badges = [];
      if (movie.contentRating) badges.push(<ContentRatingBadge rating={movie.contentRating} />);
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
          aspectRatio={backdropUrl ? "landscape" : "portrait"}
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          fallbackIcon="🎬"
          badges={badges}
          onLoad={() => imageState.setImageLoaded(true)}
        />
      );
    },
    [showBackdrop]
  );

  const renderMainContent = useCallback((movie: Movie) => {
    const bestRating = getBestDisplayRating(movie.ratings, movie.rating);
    const quality = formatQuality(movie.videoResolution, movie.audioCodec);
    return (
      <>
        <h3 className="text-xl font-bold truncate" title={movie.title}>
          {movie.title}
        </h3>
        <p>{movie.year}</p>
        <div className="mt-1">
          <p className="text-gray-400 text-sm flex items-center gap-2">
            <span>{formatDuration(movie.duration)}</span>
            {quality && (
              <>
                <span className="text-gray-600">•</span>
                <span>{quality}</span>
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
      </>
    );
  }, []);

  const renderDetailHeader = useCallback((movie: Movie) => (
    <div>
      <h2 className="text-xl font-bold">{movie.title}</h2>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-gray-400 mt-1">
        <span>{movie.year}</span>
        {movie.contentRating && (
          <>
            <span className="text-gray-600">•</span>
            <span>{movie.contentRating}</span>
          </>
        )}
        <span className="text-gray-600">•</span>
        <span>{formatDuration(movie.duration)}</span>
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
  ), []);

  const renderDetailContent = useCallback(
    (movie: Movie) => <MovieDetailContent movie={movie} />,
    []
  );

  const isTranscoding =
    movie.transcodeProgress !== undefined &&
    (movie.videoDecision === "transcode" || movie.audioDecision === "transcode");

  return (
    <BaseMediaCard
      item={movie}
      index={index}
      renderThumbnail={renderThumbnail}
      renderMainContent={renderMainContent}
      renderDetailHeader={renderDetailHeader}
      renderDetailContent={renderDetailContent}
      progressPercentage={progressPercentage}
      transcodeProgress={isTranscoding ? movie.transcodeProgress : undefined}
    />
  );
}

export default memo(MovieCard);
