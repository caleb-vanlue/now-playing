import React, { useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Track } from "../../types/media";
import { getResponsiveThumbnailUrl } from "../../utils/plexApi";
import { useSpotifyTrack } from "../hooks/useSpotifyTrack";
import {
  calculateProgress,
  calculateFinishTime,
  formatDurationMMSS,
} from "../../utils/mediaCardUtils";
import { BaseMediaCard, ImageState } from "./BaseMediaCard";
import { ImageLoadingSpinner, ProgressInfo } from "./CardComponents";
import { UserAvatar } from "./UserAvatar";
import {
  YearBadge,
  SpotifyBadge,
  ImageWithFallback,
} from "./ImageWithFallback";

interface MusicCardProps {
  track: Track;
  index?: number;
}

export default function MusicCard({ track, index = 0 }: MusicCardProps) {
  const { spotifyUrl } = useSpotifyTrack(track.artist, track.title);

  const progressPercentage = calculateProgress(
    track.viewOffset,
    track.duration
  );
  const estimatedFinishTime = track.duration
    ? calculateFinishTime(track.duration, track.viewOffset)
    : new Date();
  const formattedDuration = track.duration
    ? formatDurationMMSS(track.duration)
    : "0:00";

  const thumbnailUrl = getResponsiveThumbnailUrl(
    track.thumbnailFileId,
    "music"
  );
  const startedAt = new Date(track.startTime);

  const renderThumbnail = useCallback(
    (track: Track, imageState: ImageState) => {
      const thumbnailUrl = getResponsiveThumbnailUrl(
        track.thumbnailFileId,
        "music"
      );

      const badges = [];

      if (track.year) {
        badges.push(<YearBadge year={track.year} />);
      }

      if (spotifyUrl) {
        badges.push(<SpotifyBadge url={spotifyUrl} />);
      }

      return (
        <ImageWithFallback
          src={thumbnailUrl}
          alt={track.album || track.title}
          aspectRatio="square"
          sizes="(max-width: 640px) 300px, (max-width: 1024px) 400px, 500px"
          quality={85}
          fallbackIcon="🎵"
          badges={badges}
          onLoad={() => imageState.setImageLoaded(true)}
        />
      );
    },
    [thumbnailUrl, spotifyUrl]
  );

  const renderMainContent = useCallback(
    (track: Track) => (
      <>
        <h2 className="text-xl font-bold truncate" title={track.title}>
          {track.title}
        </h2>
        <p className="truncate" title={track.artist}>
          {track.artist}
        </p>
        <p className="text-gray-400 truncate" title={track.album}>
          {track.album}
        </p>
        {track.audioCodec && (
          <p className="text-gray-400 text-xs mt-2">
            {track.quality || track.audioCodec}
          </p>
        )}
      </>
    ),
    []
  );

  const renderDetailHeader = useCallback(
    (track: Track) => (
      <div>
        <h2 className="text-xl font-bold">{track.title}</h2>
        <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
          <span>{track.artist}</span>
          {track.album && (
            <>
              <span className="text-gray-600">•</span>
              <span>{track.album}</span>
            </>
          )}
          {track.year && (
            <>
              <span className="text-gray-600">•</span>
              <span>{track.year}</span>
            </>
          )}
        </div>
      </div>
    ),
    []
  );

  const renderDetailContent = useCallback(
    (track: Track) => (
      <>
        {track.duration && track.duration > 0 && (
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
            <p>{track.artist}</p>
          </div>

          <div className="stagger-item stagger-delay-2">
            <p className="text-gray-400 text-sm">Album</p>
            <p>
              {track.album} {track.year ? `(${track.year})` : ""}
            </p>
          </div>

          {track.audioCodec && (
            <div className="stagger-item stagger-delay-3">
              <p className="text-gray-400 text-sm">Format</p>
              <p className="uppercase">{track.audioCodec}</p>
            </div>
          )}

          {track.quality && (
            <div className="stagger-item stagger-delay-4">
              <p className="text-gray-400 text-sm">Quality</p>
              <p>{track.quality}</p>
            </div>
          )}

          {track.duration && track.duration > 0 && (
            <div className="stagger-item stagger-delay-5">
              <p className="text-gray-400 text-sm">Duration</p>
              <p>{formattedDuration}</p>
            </div>
          )}

          <div className="stagger-item stagger-delay-6">
            <p className="text-gray-400 text-sm">Device</p>
            <p>{track.player}</p>
          </div>

          <div className="stagger-item stagger-delay-7">
            <p className="text-gray-400 text-sm">User</p>
            <div className="flex items-center">
              <UserAvatar
                userId={track.userId}
                userAvatar={track.userAvatar}
                avatarError={false}
                onAvatarError={() => {}}
                size="small"
              />
              <span className="ml-2">{track.userId}</span>
            </div>
          </div>

          <div className="stagger-item stagger-delay-8">
            <p className="text-gray-400 text-sm">Started</p>
            <p>{startedAt.toLocaleTimeString()}</p>
          </div>

          <div className="stagger-item stagger-delay-9">
            <p className="text-gray-400 text-sm">Status</p>
            <p className="capitalize">{track.state}</p>
          </div>

          <div className="stagger-item stagger-delay-10 col-span-2">
            <p className="text-gray-400 text-sm">Session ID</p>
            <p className="font-mono text-xs">{track.sessionId}</p>
          </div>
        </motion.div>
      </>
    ),
    [
      spotifyUrl,
      progressPercentage,
      estimatedFinishTime,
      formattedDuration,
      startedAt,
    ]
  );

  return (
    <BaseMediaCard
      key={`${track.id}-${spotifyUrl}`}
      item={track}
      index={index}
      renderThumbnail={renderThumbnail}
      renderMainContent={renderMainContent}
      renderDetailHeader={renderDetailHeader}
      renderDetailContent={renderDetailContent}
      progressPercentage={progressPercentage}
    />
  );
}
