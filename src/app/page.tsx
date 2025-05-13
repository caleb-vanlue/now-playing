"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import MediaDashboard from "../components/MediaDashboard";
import PageTransition from "../components/PageTransition";
import NavigationTabs from "../components/NavigationTabs";
import MusicCard from "../components/MusicCard";
import MovieCard from "../components/MovieCard";
import TVShowCard from "../components/TVShowCard";
import { useMediaDataContext } from "../components/MediaDataContext";

type MediaType = "music" | "movies" | "tvshows";

export default function MediaPage() {
  const { mediaData } = useMediaDataContext();
  const [activeTab, setActiveTab] = useState<MediaType>("music");

  const tracks = mediaData?.tracks || [];
  const movies = mediaData?.movies || [];
  const episodes = mediaData?.episodes || [];

  const navItems = [
    { href: "#music", label: "Music", count: tracks.length },
    { href: "#movies", label: "Movies", count: movies.length },
    { href: "#tvshows", label: "TV Shows", count: episodes.length },
  ];

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

  const handleTabClick = (href: string) => {
    const tab = href.substring(1) as MediaType;
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "music":
        if (tracks.length === 0) {
          return (
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
          );
        }
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {tracks.map((track, index) => (
              <MusicCard key={track.id} track={track} index={index} />
            ))}
          </motion.div>
        );

      case "movies":
        if (movies.length === 0) {
          return (
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
          );
        }
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
          >
            {movies.map((movie, index) => (
              <MovieCard key={movie.id} item={movie} index={index} />
            ))}
          </motion.div>
        );

      case "tvshows":
        if (episodes.length === 0) {
          return (
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
          );
        }
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {episodes.map((episode, index) => (
              <TVShowCard key={episode.id} item={episode} index={index} />
            ))}
          </motion.div>
        );
    }
  };

  return (
    <MediaDashboard>
      <div className="mb-6">
        <NavigationTabs
          items={navItems}
          onTabClick={handleTabClick}
          activeTab={`#${activeTab}`}
        />
      </div>
      <PageTransition key={activeTab}>{renderContent()}</PageTransition>
      <a
        href="https://github.com/caleb-vanlue/now-playing"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 hover:opacity-80 transition-opacity"
      >
        <img
          src="/images/logos/github-mark-white.svg"
          alt="GitHub"
          width="48"
          height="48"
          className="w-12 h-12"
        />
      </a>
    </MediaDashboard>
  );
}
