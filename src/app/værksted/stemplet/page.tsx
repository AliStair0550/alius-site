import { permanentRedirect } from "next/navigation";

// Stemplet blev til folka, og artiklen flyttede med. Omdirigeringen er en
// side og ikke en regel i next.config.ts: en kilde med æ matchede ikke den
// URL-kodede adresse på Vercel, og siden gav 404 (2. november 2026).
export default function StempletFlyttet() {
  permanentRedirect("/værksted/folka");
}
