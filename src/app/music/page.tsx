"use client";

import { useMediaData } from "../../hooks/useMediaData";
import MusicCard from "../../components/MusicCard";
import MediaDashboard from "../../components/MediaDashboard";
import PageTransition from "../../components/PageTransition";
import { motion } from "framer-motion";

export default function MusicPage() {
  const { mediaData } = useMediaData();
  const tracks = mediaData?.tracks || [];

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
        {tracks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center text-gray-500 py-20"
          >
            <p className="text-xl">No music currently playing</p>
            <p className="mt-2">
              Music will appear here when someone starts playing
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
          >
            {tracks.map((track, index) => (
              <MusicCard
                key={track.id || track.sessionId}
                track={track}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </PageTransition>
    </MediaDashboard>
  );
}
