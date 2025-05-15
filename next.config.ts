import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "plex.tv",
        pathname: "/users/**",
      },
      {
        protocol: "https",
        hostname: "metadata-static.plex.tv",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "imdb-api.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "themoviedb.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "thetvdb.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "artworks.thetvdb.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "meta.plex.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "meta.plex.tv",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "artworks.thetvdb.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
