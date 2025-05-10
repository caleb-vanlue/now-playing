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
  user: sharedBy,
}: MediaCardProps) {
  return (
    <div className="bg-[#171717] rounded-lg overflow-hidden p-4">
      <div className="aspect-square bg-gray-800 mb-4"></div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p>{artist}</p>
      <p className="text-gray-400">{album}</p>
      <div className="mt-4 flex items-center">
        <div className="w-8 h-8 rounded-full bg-gray-700"></div>
        <span className="ml-2">{sharedBy.name}</span>
      </div>
    </div>
  );
}
