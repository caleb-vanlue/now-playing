import React from "react";

interface MovieCardProps {
  id: string;
  title: string;
  year: number | string;
  director: string;
  userId: string;
  state: "playing" | "paused";
  thumbnailFileId?: string;
}

export default function MovieCard({
  id,
  title,
  year,
  director,
  userId,
  state,
  thumbnailFileId,
}: MovieCardProps) {
  const thumbnailUrl = thumbnailFileId
    ? `http://localhost:3001/files/id/${thumbnailFileId}`
    : null;

  const movieColors: Record<string, string> = {
    Tangerine: "bg-orange-600",
    Inception: "bg-blue-800",
    "The Godfather": "bg-gray-900",
    "Pulp Fiction": "bg-yellow-600 text-black",
    default: "bg-gray-800",
  };

  const bgColorClass = movieColors[title] || movieColors.default;

  return (
    <div className="bg-[#1c1c1c] rounded-lg overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative">
        {thumbnailUrl ? (
          <div
            className="aspect-[2/3] bg-cover bg-center"
            style={{ backgroundImage: `url('${thumbnailUrl}')` }}
          />
        ) : (
          <div
            className={`aspect-[2/3] ${bgColorClass} flex items-center justify-center p-4 text-center`}
          >
            <span className="text-lg font-bold">{title}</span>
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
        <p>{year}</p>
        <p className="text-gray-400">
          {typeof year === "string" && year.includes("S")
            ? "Show:"
            : "Director:"}{" "}
          {director}
        </p>
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
