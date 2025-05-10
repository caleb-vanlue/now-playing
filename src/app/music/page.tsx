// app/music/page.tsx - Updated to use MediaCard
"use client";

import Link from "next/link";
import { useMediaData } from "../../hooks/useMediaData";
import MusicCard from "../../components/MusicCard";

export default function MusicPage() {
  const { mediaData, loading, error } = useMediaData();

  if (loading) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>;
  }

  const tracks = mediaData?.tracks || [];

  return (
    <div className="min-h-screen bg-[#141414] p-8 text-white">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-12 gap-4">
        <h1 className="text-4xl font-bold">NOW PLAYING</h1>
        <nav className="flex space-x-8">
          <Link
            href="/music"
            className="relative pb-2 text-white border-b-2 border-orange-500"
          >
            Music
          </Link>
          <Link href="/movies" className="pb-2 text-gray-400 hover:text-white">
            Movies
          </Link>
          <Link href="/tvshows" className="pb-2 text-gray-400 hover:text-white">
            TV Shows
          </Link>
        </nav>
      </header>

      <main>
        {tracks.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            <p className="text-xl">No tracks currently playing</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tracks.map((track) => (
              <MusicCard
                key={track.id}
                title={track.title}
                artist={track.artist}
                album={track.album}
                userId={track.userId}
                state={track.state}
                thumbnailFileId={track.thumbnailFileId}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
