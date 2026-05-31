import React from "react";
import { motion } from "framer-motion";
import { SiPlex, SiJellyfin } from "react-icons/si";

export function PlayingStateIndicator({
  state,
}: {
  state: "playing" | "paused";
}) {
  return (
    <div
      className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full
        ${
          state === "playing"
            ? "bg-green-500 shadow-sm shadow-green-500/30"
            : "bg-gray-700"
        }`}
    >
      {state === "playing" ? (
        <div className="flex items-center">
          <span className="mr-1">Playing</span>
          <div className="flex items-end space-x-0.5 h-2">
            {[...Array(3)].map((_, i) => (
              <span key={i} className="w-0.5 h-2 bg-white equalizer-bar"></span>
            ))}
          </div>
        </div>
      ) : (
        "Paused"
      )}
    </div>
  );
}

export function ProgressBar({
  percentage,
  transcodeProgress,
}: {
  percentage: number;
  transcodeProgress?: number;
}) {
  if (percentage <= 0) return null;

  const bufferEnd =
    transcodeProgress !== undefined
      ? percentage + (transcodeProgress / 100) * (100 - percentage)
      : undefined;

  return (
    <div
      className="h-1 w-full bg-gray-800 relative"
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Playback progress"
    >
      {bufferEnd !== undefined && (
        <div
          className="absolute top-0 h-full bg-[var(--accent)]/30"
          style={{ left: `${percentage}%`, width: `${bufferEnd - percentage}%` }}
        />
      )}
      <div
        className="absolute top-0 left-0 h-full bg-[var(--accent)]"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function ProgressInfo({
  percentage,
  estimatedFinishTime,
  transcodeProgress,
}: {
  percentage: number;
  estimatedFinishTime: Date;
  transcodeProgress?: number;
}) {
  const bufferEnd =
    transcodeProgress !== undefined
      ? percentage + (transcodeProgress / 100) * (100 - percentage)
      : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mb-4 bg-gray-800/50 rounded-lg p-3"
    >
      <div className="flex justify-between items-center mb-1 text-sm">
        <span className="whitespace-nowrap">{Math.round(percentage)}% complete</span>
        <span className="whitespace-nowrap shrink-0 ml-3">
          Ends at{" "}
          <time dateTime={estimatedFinishTime.toISOString()}>
            {estimatedFinishTime.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
        </span>
      </div>
      {transcodeProgress !== undefined && (
        <div className="text-xs text-gray-500 text-center mb-1">transcoding</div>
      )}
      <div
        className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          bufferEnd !== undefined
            ? `Playback ${Math.round(percentage)}% complete, transcoded to ${Math.round(bufferEnd)}%`
            : "Detailed playback progress"
        }
      >
        {bufferEnd !== undefined && (
          <div
            className="absolute top-0 h-full bg-[var(--accent)]/30"
            style={{
              left: `${percentage}%`,
              width: `${bufferEnd - percentage}%`,
            }}
          />
        )}
        <div
          className="absolute top-0 left-0 h-full bg-[var(--accent)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </motion.div>
  );
}

export function SourceIcon({
  source,
  size = 24,
}: {
  source: "plex" | "jellyfin";
  size?: number;
}) {
  return source === "plex" ? (
    <SiPlex size={size} className="text-gray-500 shrink-0" title="Plex" />
  ) : (
    <SiJellyfin size={Math.round(size * 0.8)} className="text-gray-500 shrink-0" title="Jellyfin" />
  );
}

export function ImageLoadingSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
      <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
