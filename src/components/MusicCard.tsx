"use client";
import React, { useState } from "react";
import { getThumbnailUrl } from "../../utils/api";

interface MusicCardProps {
  title: string;
  artist: string;
  album: string;
  userId: string;
  state: "playing" | "paused";
  thumbnailFileId?: string;
}

export default function MusicCard({
  title,
  artist,
  album,
  userId,
  state,
  thumbnailFileId,
}: MusicCardProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  const thumbnailUrl = getThumbnailUrl(thumbnailFileId);

  const bgColorClass = "bg-gray-800";

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="bg-[#1c1c1c] rounded-lg overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative">
        {thumbnailUrl && !imageError ? (
          <div className="aspect-square relative">
            <img
              src={thumbnailUrl}
              alt={`${album} by ${artist}`}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          </div>
        ) : (
          <div
            className={`aspect-square ${bgColorClass} flex items-center justify-center`}
          >
            <span className="text-lg font-bold">{album}</span>
          </div>
        )}
        <div
          className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${
            state === "playing" ? "bg-green-500" : "bg-gray-700"
          }`}
        >
          {state === "playing" ? (
            <div className="flex items-center">
              <span className="mr-1">Playing</span>
              <span className="flex space-x-0.5">
                <span className="w-0.5 h-2 bg-white animate-pulse"></span>
                <span className="w-0.5 h-2 bg-white animate-pulse delay-75"></span>
                <span className="w-0.5 h-2 bg-white animate-pulse delay-150"></span>
              </span>
            </div>
          ) : (
            "Paused"
          )}
        </div>
      </div>
      <div className="p-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <p>{artist}</p>
        <p className="text-gray-400">{album}</p>
        <div className="mt-4 flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">
            {userId.charAt(0)}
          </div>
          <span className="ml-2">{userId}</span>
        </div>
      </div>
    </div>
  );
}
