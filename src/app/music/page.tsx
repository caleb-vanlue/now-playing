"use client";

import { useMediaData } from "../../hooks/useMediaData";
import MediaDashboard from "../../components/MediaDashboard";
import MusicCard from "../../components/MusicCard";

export default function MusicPage() {
  const { mediaData } = useMediaData();
  const tracks = mediaData?.tracks || [];

  return (
    <MediaDashboard>
      {tracks.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          <p className="text-xl">No tracks currently playing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track) => (
            <MusicCard key={track.id} track={track} />
          ))}
        </div>
      )}
    </MediaDashboard>
  );
}
