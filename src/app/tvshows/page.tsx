import Link from "next/link";
import MovieCard from "../../components/MovieCard";

interface TVShow {
  id: string;
  title: string;
  year: string;
  creator: string;
  poster: string;
  user: {
    name: string;
  };
  isPlaying?: boolean;
}

export default function TVShowsPage() {
  const tvShows: TVShow[] = [
    {
      id: "1",
      title: "Breaking Bad",
      year: "2008-2013",
      creator: "Vince Gilligan",
      poster: "/posters/breakingbad.jpg",
      user: { name: "Emma" },
      isPlaying: true,
    },
    {
      id: "2",
      title: "Stranger Things",
      year: "2016-Present",
      creator: "The Duffer Brothers",
      poster: "/posters/strangerthings.jpg",
      user: { name: "Kyle" },
    },
    {
      id: "3",
      title: "The Office",
      year: "2005-2013",
      creator: "Greg Daniels",
      poster: "/posters/office.jpg",
      user: { name: "Sarah" },
    },
    {
      id: "4",
      title: "Game of Thrones",
      year: "2011-2019",
      creator: "David Benioff, D.B. Weiss",
      poster: "/posters/got.jpg",
      user: { name: "Tom" },
    },
    {
      id: "5",
      title: "The Mandalorian",
      year: "2019-Present",
      creator: "Jon Favreau",
      poster: "/posters/mandalorian.jpg",
      user: { name: "Alex" },
    },
    {
      id: "6",
      title: "The Witcher",
      year: "2019-Present",
      creator: "Lauren Schmidt Hissrich",
      poster: "/posters/witcher.jpg",
      user: { name: "Maya" },
    },
  ];

  return (
    <div className="min-h-screen p-8">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-12 gap-4">
        <h1 className="text-4xl font-bold">Now Playing</h1>
        <nav className="flex space-x-8">
          <Link href="/music" className="pb-2 text-gray-400 hover:text-white">
            Music
          </Link>
          <Link href="/movies" className="pb-2 text-gray-400 hover:text-white">
            Movies
          </Link>
          <Link
            href="/tvshows"
            className="relative pb-2 text-white border-b-2 border-orange-500"
          >
            TV Shows
          </Link>
        </nav>
      </header>

      <main>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {tvShows.map((show) => (
            <MovieCard
              key={show.id}
              id={show.id}
              title={show.title}
              year={show.year}
              creator={show.creator}
              poster={show.poster}
              user={show.user}
              isPlaying={show.isPlaying}
              type="tvshow"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
