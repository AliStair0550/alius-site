import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/tankeprofil/hold/admin",
        "/tankeprofil/hold/rapport",
        "/tankeprofil/min-profil",
        "/tankeprofil/join",
      ],
    },
    sitemap: "https://alius.dk/sitemap.xml",
    host: "https://alius.dk",
  };
}
