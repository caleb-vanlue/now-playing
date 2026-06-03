import React from "react";
import { SiImdb, SiRottentomatoes, SiThemoviedatabase } from "react-icons/si";
import { FaStar } from "react-icons/fa";

interface RatingLike {
  image?: string;
  type: string;
}

export function getRatingIcon(rating: RatingLike): React.ReactNode {
  const img = rating.image?.toLowerCase() ?? "";

  if (img.includes("rottentomatoes")) {
    if (img.includes("ripe")) return <SiRottentomatoes className="text-red-500 shrink-0" />;
    return <SiRottentomatoes className="text-green-500 shrink-0" />;
  }
  if (img.includes("imdb")) return <SiImdb className="text-yellow-400 shrink-0" />;
  if (img.includes("themoviedb") || img.includes("thetvdb"))
    return <SiThemoviedatabase className="text-blue-400 shrink-0" />;

  return <FaStar className="text-yellow-400 shrink-0" />;
}
