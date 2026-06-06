import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { SiPlex, SiJellyfin } from "react-icons/si";
import { HiChevronDown } from "react-icons/hi";
import { Rating, Person } from "../../types/media";
import { getRatingSource } from "../../utils/mediaCardUtils";
import { getRatingIcon } from "../../utils/ratingIcons";

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
        <span className="whitespace-nowrap">
          {Math.round(percentage)}% complete
        </span>
        <span className="whitespace-nowrap shrink-0 ml-3">
          Done @{" "}
          <time dateTime={estimatedFinishTime.toISOString()}>
            {estimatedFinishTime.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
              hour12: false,
            })}
          </time>
        </span>
      </div>
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
    <SiJellyfin
      size={Math.round(size * 0.8)}
      className="text-gray-500 shrink-0"
      title="Jellyfin"
    />
  );
}

export function ImageLoadingSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
      <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

// ── Shared detail-panel sections ──────────────────────────────────────────────

export function SummarySection({ summary, delay = 0.2 }: { summary: string; delay?: number }) {
  if (!summary) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mb-4"
    >
      <p className="text-gray-400 text-sm">Summary</p>
      <p className="text-sm leading-tight">{summary}</p>
    </motion.div>
  );
}

export function RatingsSection({ ratings, delay = 0.3 }: { ratings?: Rating[]; delay?: number }) {
  if (!ratings?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mt-4"
    >
      <p className="text-gray-400 text-sm mb-2">Ratings</p>
      <div className="flex flex-wrap gap-3">
        {ratings.map((rating, i) => (
          <div key={i} className="flex items-center gap-2">
            {getRatingIcon(rating)}
            <span className="text-xs text-gray-400">{getRatingSource(rating)}:</span>
            <span className="text-sm font-medium">{rating.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

const CAST_INITIAL = 6;

function CastMemberCard({ actor, index: i }: { actor: Person; index: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = actor.tag.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const showFallback = !actor.thumb || imgFailed;

  return (
    <motion.a
      initial={i >= CAST_INITIAL ? { opacity: 0, scale: 0.85 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, delay: i >= CAST_INITIAL ? (i - CAST_INITIAL) * 0.04 : 0 }}
      href={`https://www.imdb.com/find?q=${encodeURIComponent(actor.tag)}&s=nm`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1.5 min-w-0 px-1 group"
    >
      <div className="relative w-full aspect-square rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-[var(--accent)] transition-all">
        {showFallback ? (
          <div className="absolute inset-0 bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300">
            {initials}
          </div>
        ) : (
          <Image
            src={actor.thumb!}
            alt={actor.tag}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 45vw, 30vw"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      <div className="text-xs min-w-0 w-full text-center">
        <p className="font-medium truncate group-hover:text-[var(--accent)] transition-colors">{actor.tag}</p>
        {actor.role && <p className="text-gray-500 truncate">{actor.role}</p>}
      </div>
    </motion.a>
  );
}

export function CastGrid({ actors, delay = 0.35 }: { actors?: Person[]; delay?: number }) {
  const [expanded, setExpanded] = useState(false);

  if (!actors?.length) return null;

  const hasMore = actors.length > CAST_INITIAL;
  const visible = expanded ? actors : actors.slice(0, CAST_INITIAL);
  const hiddenCount = actors.length - CAST_INITIAL;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mt-4"
    >
      <p className="text-gray-400 text-sm mb-2">Cast</p>
      <div className="grid grid-cols-3 gap-3">
        {visible.map((actor, i) => (
          <CastMemberCard key={actor.tag} actor={actor} index={i} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-[var(--accent)] transition-colors py-1"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={expanded ? "less" : "more"}
              initial={{ opacity: 0, y: expanded ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: expanded ? -4 : 4 }}
              transition={{ duration: 0.15 }}
            >
              {expanded ? "show less" : `show ${hiddenCount} more`}
            </motion.span>
          </AnimatePresence>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center"
          >
            <HiChevronDown size={13} />
          </motion.span>
        </button>
      )}
    </motion.div>
  );
}

export function GenresSection({ genres, delay = 0.4 }: { genres?: string[]; delay?: number }) {
  if (!genres?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mt-4"
    >
      <p className="text-gray-400 text-sm mb-2">Genres</p>
      <div className="flex flex-wrap gap-2">
        {genres.map((g, i) => (
          <span key={i} className="bg-gray-800 px-2 py-1 rounded-md text-xs">{g}</span>
        ))}
      </div>
    </motion.div>
  );
}

export function WritersSection({ writers, delay = 0.8 }: { writers?: Person[]; delay?: number }) {
  if (!writers?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mt-4"
    >
      <p className="text-gray-400 text-sm mb-1">Writers</p>
      <p className="text-sm">{writers.map((w) => w.tag).join(", ")}</p>
    </motion.div>
  );
}
