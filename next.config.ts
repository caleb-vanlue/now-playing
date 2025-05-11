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
    ],
  },
};

export default nextConfig;
