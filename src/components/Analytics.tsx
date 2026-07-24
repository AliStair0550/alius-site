"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";

// Ruter hvor selve URL'en indeholder et adgangstoken. GA sender automatisk
// page_location, så indlæses tagget her, ville et gyldigt token blive sendt
// videre til tredjepart. Derfor indlæses GA slet ikke på disse sider.
const TOKEN_ROUTES = [
  "/tankeprofil/hold/admin",
  "/tankeprofil/hold/rapport",
  "/tankeprofil/join",
  "/tankeprofil/min-profil",
];

// Udleder eventnavnet af det klikkede element. data-analytics vinder, så en
// knap kan markeres eksplicit; ellers gættes ud fra href.
function eventForElement(el: Element): AnalyticsEvent | null {
  const explicit = el.getAttribute("data-analytics");
  if (explicit === "kontakt_klik") return "kontakt_klik";

  const href = el.getAttribute("href") ?? "";
  if (href.startsWith("mailto:")) return "klik_mail";
  if (href.startsWith("tel:")) return "klik_ring";
  if (href.includes("#kontakt")) return "kontakt_klik";
  return null;
}

export default function Analytics({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const onTokenRoute = TOKEN_ROUTES.some((r) => pathname?.startsWith(r));

  useEffect(() => {
    // Delegeret lytter: fanger også links i server-komponenter, uden at nogen
    // af dem skal gøres til client components.
    function onClick(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const el = target.closest("a, button");
      if (!el) return;
      const event = eventForElement(el);
      if (event) trackEvent(event);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (onTokenRoute) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
