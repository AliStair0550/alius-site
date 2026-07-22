import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "markusbrandt.dk", pathname: "/assets/**" },
      { protocol: "https", hostname: "www.cafe-cix.dk", pathname: "/assets/**" },
    ],
  },
};

export default nextConfig;
