import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "markusbrandt.dk", pathname: "/assets/**" },
      { protocol: "https", hostname: "www.cafe-cix.dk", pathname: "/assets/**" },
    ],
  },
  // Værkstedet flyttede fra /artikler til /værksted. Behold den gamle sti som
  // permanent redirect, så tidlige links/crawls ikke rammer en 404.
  async redirects() {
    return [
      { source: "/artikler/:slug*", destination: "/værksted/:slug*", permanent: true },
      { source: "/artikler", destination: "/værksted", permanent: true },
    ];
  },
};

export default nextConfig;
