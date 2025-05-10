import React from "react";

interface MediaCardProps {
  title: string;
  artist: string;
  album: string;
  user: {
    name: string;
  };
}

export default function MediaCard({
  title,
  artist,
  album,
  user,
}: MediaCardProps) {
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
    <div className="bg-[#171717] rounded-lg overflow-hidden">
      <div
        className={`aspect-square ${bgColorClass} flex items-center justify-center`}
      >
        <span className="text-lg font-bold">{album}</span>
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
