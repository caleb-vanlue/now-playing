"use client";

import { useMediaData } from "../../hooks/useMediaData";
import MovieCard from "../../components/MovieCard";
import MediaDashboard from "../../components/MediaDashboard";

export default function MoviesPage() {
  const { mediaData } = useMediaData();
  const movies = mediaData?.movies || [];

  return (
    <MediaDashboard>
      {movies.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          <p className="text-xl">No movies currently playing</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {movies.map((movie) => (
            <MovieCard key={movie.id} item={movie} type="movie" />
          ))}
        </div>
      )}
    </MediaDashboard>
  );
}
