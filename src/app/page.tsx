import Link from "next/link";

export default function Home() {
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
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="bg-[#171717] rounded-lg overflow-hidden p-4"
            >
              <div className="aspect-square bg-gray-800 mb-4"></div>
              <h2 className="text-xl font-bold">Album Title</h2>
              <p>Artist Name</p>
              <p className="text-gray-400">Album Name</p>
              <div className="mt-4 flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-700"></div>
                <span className="ml-2">Username</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
