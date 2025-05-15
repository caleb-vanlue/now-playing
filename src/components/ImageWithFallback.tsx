import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ImageLoadingSpinner } from "./CardComponents";

interface ImageWithFallbackProps {
  src: string | null;
  alt: string;
  aspectRatio?: "square" | "portrait" | "landscape";
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  quality?: number;
  className?: string;
  fallbackIcon?: React.ReactNode;
  priority?: boolean;
  badges?: React.ReactNode[];
  onClick?: () => void;
  onLoad?: () => void;
}

export function ImageWithFallback({
  src,
  alt,
  aspectRatio = "portrait",
  fill = true,
  width,
  height,
  sizes = "(max-width: 768px) 100vw, 50vw",
  quality = 80,
  className = "",
  fallbackIcon,
  priority = false,
  badges = [],
  onClick,
  onLoad,
}: ImageWithFallbackProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const aspectRatioClasses = {
    square: "aspect-[1]",
    portrait: "aspect-[2/3]",
    landscape: "aspect-[16/9]",
  };

  if (!src || hasError) {
    return (
      <div
        className={`${aspectRatioClasses[aspectRatio]} relative flex items-center justify-center bg-gray-800 overflow-hidden ${className}`}
        onClick={onClick}
      >
        <div className="text-gray-600 text-2xl">
          {fallbackIcon || alt.charAt(0).toUpperCase()}
        </div>
        {badges.map((badge, index) => (
          <React.Fragment key={index}>{badge}</React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${aspectRatioClasses[aspectRatio]} relative overflow-hidden ${className}`}
      onClick={onClick}
    >
      {isLoading && <ImageLoadingSpinner />}

      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        sizes={sizes}
        quality={quality}
        priority={priority}
        className={`object-cover transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={handleLoad}
        onError={handleError}
      />

      {badges.map((badge, index) => (
        <React.Fragment key={index}>{badge}</React.Fragment>
      ))}
    </div>
  );
}

export function ContentRatingBadge({ rating }: { rating: string }) {
  return (
    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
      {rating}
    </div>
  );
}

export function TranscodeStatusBadge({
  videoDecision,
  audioDecision,
}: {
  videoDecision?: string;
  audioDecision?: string;
}) {
  if (!videoDecision && !audioDecision) return null;

  return (
    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
      {videoDecision === "transcode"
        ? "Video Transcode"
        : audioDecision === "transcode"
        ? "Audio Transcode"
        : "Direct Play"}
    </div>
  );
}

export function SeasonEpisodeBadge({
  season,
  episode,
}: {
  season: number;
  episode: number;
}) {
  return (
    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
      {`S${season}:E${episode}`}
    </div>
  );
}

export function YearBadge({ year }: { year: number }) {
  return (
    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
      {year}
    </div>
  );
}

export function SpotifyBadge({ url }: { url: string }) {
  return (
    <motion.a
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      href={url}
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
    </motion.a>
  );
}
