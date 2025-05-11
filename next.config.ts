import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
