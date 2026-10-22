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
      // Finns arkiv flyttede 22. oktober 2026 fra /agenter/finn/<dato> til
      // /agenter/finn/arkiv/<dato>, så /agenter/finn/<område> kunne blive
      // områdesider. Kun datoer omdirigeres; et område matcher ikke.
      { source: "/agenter/finn/:dato(\\d{4}-\\d{2}-\\d{2})", destination: "/agenter/finn/arkiv/:dato", permanent: true },
    ];
  },
};

export default nextConfig;
