// components/MediaCard.tsx
import React from "react";

interface MediaCardProps {
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
}: MediaCardProps) {
  const thumbnailUrl = thumbnailFileId
    ? `http://localhost:3001/files/id/${thumbnailFileId}`
    : null;

  const albumColors: Record<string, string> = {
    Blue: "bg-blue-900",
    Revolver: "bg-gray-200 text-black",
    Starman: "bg-purple-900",
    Lungs: "bg-red-700",
    "Knives Out": "bg-red-900",
    Rumours: "bg-amber-100 text-black",
    Africa: "bg-red-700",
    default: "bg-gray-800",
  };

  const bgColorClass = albumColors[album] || albumColors.default;

  return (
    <div className="bg-[#1c1c1c] rounded-lg overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative">
        {thumbnailUrl ? (
          <div
            className="aspect-square bg-cover bg-center"
            style={{ backgroundImage: `url('${thumbnailUrl}')` }}
          />
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
          {state === "playing" ? "Playing" : "Paused"}
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
