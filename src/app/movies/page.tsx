import Link from "next/link";
import MovieCard from "../../components/MovieCard";

interface Movie {
  id: string;
  title: string;
  year: string;
  director: string;
  poster: string;
  user: {
    name: string;
  };
  isPlaying?: boolean;
}

export default function MoviesPage() {
  const movies: Movie[] = [
    {
      id: "1",
      title: "Inception",
      year: "2010",
      director: "Christopher Nolan",
      poster: "/posters/inception.jpg",
      user: { name: "Emma" },
      isPlaying: true,
    },
    {
      id: "2",
      title: "The Godfather",
      year: "1972",
      director: "Francis Ford Coppola",
      poster: "/posters/godfather.jpg",
      user: { name: "Kyle" },
    },
    {
      id: "3",
      title: "Pulp Fiction",
      year: "1994",
      director: "Quentin Tarantino",
      poster: "/posters/pulpfiction.jpg",
      user: { name: "Sarah" },
    },
    {
      id: "4",
      title: "The Dark Knight",
      year: "2008",
      director: "Christopher Nolan",
      poster: "/posters/darkknight.jpg",
      user: { name: "Tom" },
    },
    {
      id: "5",
      title: "Goodfellas",
      year: "1990",
      director: "Martin Scorsese",
      poster: "/posters/goodfellas.jpg",
      user: { name: "Alex" },
    },
    {
      id: "6",
      title: "The Shawshank Redemption",
      year: "1994",
      director: "Frank Darabont",
      poster: "/posters/shawshank.jpg",
      user: { name: "Maya" },
    },
  ];

  return (
    <div className="min-h-screen p-8">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-12 gap-4">
        <h1 className="text-4xl font-bold">NOW PLAYING</h1>
        <nav className="flex space-x-8">
          <Link href="/" className="pb-2 text-gray-400 hover:text-white">
            Music
          </Link>
          <Link
            href="/movies"
            className="relative pb-2 text-white border-b-2 border-orange-500"
          >
            Movies
          </Link>
          <Link href="/tvshows" className="pb-2 text-gray-400 hover:text-white">
            TV Shows
          </Link>
        </nav>
      </header>

      <main>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              id={movie.id}
              title={movie.title}
              year={movie.year}
              director={movie.director}
              poster={movie.poster}
              user={movie.user}
              isPlaying={movie.isPlaying}
              type="movie"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
