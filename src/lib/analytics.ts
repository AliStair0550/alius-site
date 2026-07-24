// GA4-events.
//
// Sender kun et fast eventnavn - aldrig parametre. Det er bevidst: ingen
// personhenførbare data må havne i Google Analytics. Hvis gtag ikke er
// indlæst (lokal udvikling, preview, blokeret af adblocker) er kaldet et no-op.

type Gtag = (...args: unknown[]) => void;

export type AnalyticsEvent =
  | "kontakt_klik"
  | "kontakt_sendt"
  | "klik_mail"
  | "klik_ring";

export function trackEvent(name: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag === "function") {
    gtag("event", name);
  }
}
