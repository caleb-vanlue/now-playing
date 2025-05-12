import React from "react";
import { motion } from "framer-motion";

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

export function ProgressBar({ percentage }: { percentage: number }) {
  if (percentage <= 0) return null;

  return (
    <div className="h-1 w-full bg-gray-800 relative">
      <div
        className="absolute top-0 left-0 h-full bg-orange-500"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
}

export function ProgressInfo({
  percentage,
  estimatedFinishTime,
}: {
  percentage: number;
  estimatedFinishTime: Date;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mb-4 bg-gray-800/50 rounded-lg p-3"
    >
      <div className="flex justify-between items-center mb-1 text-sm">
        <span>{Math.round(percentage)}% complete</span>
        <span>
          Ends at{" "}
          {estimatedFinishTime.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </motion.div>
  );
}

export function ImageLoadingSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
