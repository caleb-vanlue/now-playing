import Link from "next/link";
import MediaCard from "../components/MediaCard";

interface MediaItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  user: {
    name: string;
  };
}

export default function Home() {
  const mediaItems: MediaItem[] = [
    {
      id: "1",
      title: "Blue",
      artist: "Joni Mitchell",
      album: "Blue",
      user: { name: "Emma" },
    },
    {
      id: "2",
      title: "Eleanor Rigby",
      artist: "The Beatles",
      album: "Revolver",
      user: { name: "Kyle" },
    },
    {
      id: "3",
      title: "Starman",
      artist: "David Bowie",
      album: "Starman",
      user: { name: "Sarah" },
    },
    {
      id: "4",
      title: "Knives Out",
      artist: "Radiohead",
      album: "Knives Out",
      user: { name: "Tom" },
    },
    {
      id: "5",
      title: "Dreams",
      artist: "Fleetwood Mac",
      album: "Rumours",
      user: { name: "Alex" },
    },
    {
      id: "6",
      title: "Africa",
      artist: "Toto",
      album: "Africa",
      user: { name: "Maya" },
    },
  ];

  return (
    <div className="min-h-screen p-8">
      <header className="flex justify-between items-center mb-12">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mediaItems.map((item) => (
            <MediaCard
              key={item.id}
              title={item.title}
              artist={item.artist}
              album={item.album}
              user={item.user}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
