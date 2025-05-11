"use client";

import { useMediaData } from "../../hooks/useMediaData";
import MovieCard from "../../components/MovieCard";
import MediaDashboard from "../../components/MediaDashboard";
import PageTransition from "../../components/PageTransition";
import { motion } from "framer-motion";

export default function MoviesPage() {
  const { mediaData } = useMediaData();
  const movies = mediaData?.movies || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <MediaDashboard>
      <PageTransition>
        {movies.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center text-gray-500 py-20"
          >
            <p className="text-xl">No movies currently playing</p>
            <p className="mt-2">
              Movies will appear here when someone starts playing
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
          >
            {movies.map((movie, index) => (
              <MovieCard key={movie.id} item={movie} index={index} />
            ))}
          </motion.div>
        )}
      </PageTransition>
    </MediaDashboard>
  );
}
