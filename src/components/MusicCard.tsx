import React from "react";

interface MusicCardProps {
  title: string;
  artist: string;
  album: string;
  user: {
    name: string;
  };
  isPlaying?: boolean;
}

export default function MusicCard({
  title,
  artist,
  album,
  user,
  isPlaying = false,
}: MusicCardProps) {
  const albumColors: Record<string, string> = {
    Blue: "bg-blue-900",
    Revolver: "bg-gray-200 text-black",
    Starman: "bg-purple-900",
    "Knives Out": "bg-red-900",
    Rumours: "bg-amber-100 text-black",
    Africa: "bg-red-700",
    default: "bg-gray-800",
  };

  const bgColorClass = albumColors[album] || albumColors.default;

  return (
    <div className="bg-[#1c1c1c] rounded-lg overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative">
        <div
          className={`aspect-square ${bgColorClass} flex items-center justify-center`}
        >
          <span className="text-lg font-bold">{album}</span>
        </div>
        {isPlaying && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
            Now Playing
          </div>
        )}
      </div>
      <div className="p-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <p>{artist}</p>
        <p className="text-gray-400">{album}</p>
        <div className="mt-4 flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">
            {user.name.charAt(0)}
          </div>
          <span className="ml-2">{user.name}</span>
        </div>
      </div>
    </div>
  );
}
