import React from "react";

interface MovieCardProps {
  id: string;
  title: string;
  year: string;
  director?: string;
  creator?: string;
  poster: string;
  user: {
    name: string;
  };
  isPlaying?: boolean;
  type: "movie" | "tvshow";
}

export default function MovieCard({
  title,
  year,
  director,
  creator,
  user,
  isPlaying = false,
  type,
}: MovieCardProps) {
  const colorMap: Record<string, string> = {
    Inception: "bg-blue-800",
    "The Godfather": "bg-gray-900",
    "Pulp Fiction": "bg-yellow-500 text-black",
    "Breaking Bad": "bg-green-900",
    "Stranger Things": "bg-red-900",
    "The Office": "bg-blue-200 text-black",
    default: "bg-gray-800",
  };

  const bgColorClass = colorMap[title] || colorMap.default;

  return (
    <div className="bg-[#1c1c1c] rounded-lg overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative">
        <div
          className={`aspect-[2/3] ${bgColorClass} flex items-center justify-center p-4 text-center`}
        >
          <span className="text-lg font-bold">{title}</span>
        </div>
        {isPlaying && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
            Now Playing
          </div>
        )}
      </div>
      <div className="p-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <p>{year}</p>
        {director && <p className="text-gray-400">Director: {director}</p>}
        {creator && <p className="text-gray-400">Creator: {creator}</p>}
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
