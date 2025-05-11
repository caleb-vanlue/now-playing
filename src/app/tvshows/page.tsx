"use client";

import { motion } from "framer-motion";
import { useMediaData } from "../../hooks/useMediaData";
import MediaDashboard from "../../components/MediaDashboard";
import PageTransition from "../../components/PageTransition";
import TVShowCard from "../../components/TVShowCard";

export default function TVShowsPage() {
  const { mediaData } = useMediaData();
  const episodes = mediaData?.episodes || [];

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
        {episodes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center text-gray-500 py-20"
          >
            <p className="text-xl">No TV shows currently playing</p>
            <p className="mt-2">
              TV shows will appear here when someone starts playing
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6"
          >
            {episodes.map((episode: any, index: any) => (
              <TVShowCard key={episode.id} item={episode} index={index} />
            ))}
          </motion.div>
        )}
      </PageTransition>
    </MediaDashboard>
  );
}
