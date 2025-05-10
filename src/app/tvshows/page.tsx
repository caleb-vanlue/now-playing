"use client";

import { useMediaData } from "../../hooks/useMediaData";
import MovieCard from "../../components/MovieCard";
import MediaDashboard from "../../components/MediaDashboard";

export default function TVShowsPage() {
  const { mediaData } = useMediaData();
  const episodes = mediaData?.episodes || [];

  return (
    <MediaDashboard>
      {episodes.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          <p className="text-xl">No TV shows currently playing</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {episodes.map((episode) => (
            <MovieCard key={episode.id} item={episode} type="tvshow" />
          ))}
        </div>
      )}
    </MediaDashboard>
  );
}
