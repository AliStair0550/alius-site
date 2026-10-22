// ============================================================
// Kommende regnskaber de næste 14 dage, som Finn læser dem
//
// Bygger på selskabernes finanskalendere fra Nasdaq (se
// regnskaber/nasdaq-kalender.ts). Én post med kalenderen som kontekst,
// så Finn kan skrive "Mærsk offentliggør 3. kvartal 5. november" og
// selvtjekket kan spore datoen. Dækningen siges i beskrivelsen: kun de
// selskaber der udsender en læsbar finanskalender.
// ============================================================

import { hentKalendere } from "../../regnskaber/nasdaq-kalender";
import { SELSKABER } from "../../../../config/selskaber";
import type { Kilde, KildeSvar, TalPost } from "./typer";

const DAGE = 14;
const MAANEDER = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
const langDato = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d}. ${MAANEDER[m - 1]} ${a}`;
};

export const regnskabskalender: Kilde = {
  id: "regnskabskalender",
  navn: "Nasdaq Copenhagen, selskabernes finanskalendere",
  version: 1,
  beskrivelse:
    `Datoer for kommende regnskaber de næste ${DAGE} dage, læst af selskabernes egne finanskalender-meddelelser. ` +
    `Dækker kun de af de ${SELSKABER.length} selskaber der udsender en læsbar finanskalender; at et selskab ikke står ` +
    `her, betyder ikke at det ikke offentliggør.`,
  async hent(dag: string): Promise<KildeSvar> {
    const nu = new Date(`${dag}T00:00:00Z`);
    const base = { kilde: this.id, navn: this.navn, url: "https://www.nasdaq.com/european-market-activity/news", hentet: new Date().toISOString() };
    const kal = await hentKalendere(nu);
    const fejl = kal.filter((k) => k.status === "fejl");
    const kendte = kal.filter((k) => k.status === "kalender");
    const til = new Date(nu.getTime() + DAGE * 86_400_000).toISOString().slice(0, 10);
    const kommende = kal
      .flatMap((k) => k.punkter.filter((p) => p.dato >= dag && p.dato <= til).map((p) => ({ ...p, navn: k.navn })))
      .sort((a, b) => a.dato.localeCompare(b.dato));
    const besked = fejl.length ? `Kalenderen kunne ikke læses for: ${fejl.map((k) => `${k.navn} (${k.besked})`).join(", ")}` : undefined;
    if (kommende.length === 0) {
      return { ...base, status: "tom", besked: besked ?? `Ingen kendte regnskabsdatoer de næste ${DAGE} dage blandt de ${kendte.length} selskaber med læsbar kalender.`, poster: [] };
    }
    const post: TalPost = {
      type: "tal",
      id: "kalender:regnskaber",
      kilde: this.id,
      navn: `Kommende regnskaber de næste ${DAGE} dage`,
      enhed: "regnskaber",
      saeson: "ikke relevant",
      url: base.url,
      periode: `${langDato(dag)} til ${langDato(til)}`,
      vaerdi: kommende.length,
      vaerdiTekst: String(kommende.length),
      sammenligning: null,
      forloeb: [],
      tendens: null,
      foersteGangSet: new Date().toISOString(),
      kontekst:
        kommende.map((p) => `${p.navn}: ${p.begivenhed.toLowerCase()} ${langDato(p.dato)}.`).join(" ") +
        ` Datoer kendt for ${kendte.length} af ${SELSKABER.length} selskaber.`,
    };
    return { ...base, status: "ok", ...(besked ? { besked } : {}), poster: [post] };
  },
};
