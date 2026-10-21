// ============================================================
// Boligpriser direkte fra Danmarks Statistik (EJ56)
//
// Pulse har kun ejendomsværdier årligt. EJ56 er DST's kvartalsvise
// prisindeks for ejendomssalg. Vi henter indekset og DST's egen
// ændring i forhold til samme kvartal året før (TAL 310), så
// sammenligningen er DST's og ikke vores regnestykke, og sæsonudsving
// er ude af billedet.
// ============================================================

import { getTableData, getTableMetadata } from "../../dst";
import { periodeTekst } from "./pulse";
import type { Kilde, KildeSvar, TalPost } from "./typer";

const KATEGORIER = [
  { kode: "0111", navn: "Boligpriser, enfamiliehuse, prisindeks" },
  { kode: "2103", navn: "Boligpriser, ejerlejligheder, prisindeks" },
];

const daTal = (v: number, dec: number) =>
  v.toLocaleString("da-DK", { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const dstBoligpriser: Kilde = {
  id: "dst.ej56",
  navn: "Danmarks Statistik, prisindeks for ejendomssalg (EJ56)",
  beskrivelse:
    "Kvartalsvist prisindeks for salg af enfamiliehuse og ejerlejligheder i hele landet, med DST's egen " +
    "ændring i forhold til samme kvartal året før. Ikke sæsonkorrigeret, derfor sammenlignes år mod år.",
  async hent(): Promise<KildeSvar> {
    // DST's eget opdateringstidspunkt er udgivelsestiden. Hentetiden
    // ville være en påstand om noget vi ikke ved.
    const meta = await getTableMetadata("EJ56");
    const udgivet = new Date(meta.updated);
    if (Number.isNaN(udgivet.getTime())) throw new Error(`EJ56: DST's opdateringstid "${meta.updated}" kan ikke læses`);
    const data = await getTableData("EJ56", [
      { code: "OMRÅDE", values: ["000"] },
      { code: "EJENDOMSKATE", values: KATEGORIER.map((k) => k.kode) },
      { code: "TAL", values: ["100", "310"] },
      { code: "Tid", values: ["*"] },
    ]);
    const poster: TalPost[] = [];
    for (const k of KATEGORIER) {
      const raekker = data
        .filter((d) => d.dimensions.EJENDOMSKATE === k.kode && d.value !== null)
        .sort((a, b) => b.periodDate.getTime() - a.periodDate.getTime());
      const indeks = raekker.filter((r) => r.dimensions.TAL === "100");
      const aar = raekker.filter((r) => r.dimensions.TAL === "310");
      if (!indeks.length) continue;
      const nyeste = indeks[0];
      const aendring = aar.find((a) => a.period === nyeste.period);
      poster.push({
        type: "tal",
        id: `dst.ej56:${k.kode}`,
        kilde: "dst.ej56",
        navn: k.navn,
        enhed: "",
        saeson: "ikke korrigeret",
        url: "https://www.statbank.dk/EJ56",
        periode: periodeTekst(nyeste.periodDate, "QUARTERLY"),
        vaerdi: nyeste.value!,
        vaerdiTekst: daTal(nyeste.value!, 1),
        sammenligning:
          aendring && aendring.value !== null
            ? {
                slags: "samme periode året før",
                periode: periodeTekst(new Date(Date.UTC(nyeste.periodDate.getUTCFullYear() - 1, nyeste.periodDate.getUTCMonth(), 1)), "QUARTERLY"),
                vaerdi: null,
                vaerdiTekst: null,
                aendring: aendring.value,
                aendringEnhed: "procent",
                aendringTekst: `${aendring.value > 0 ? "+" : ""}${daTal(aendring.value, 1)} procent`,
              }
            : null,
        forloeb: [],
        tendens: null,
        foersteGangSet: udgivet.toISOString(),
      });
    }
    return {
      kilde: this.id,
      navn: this.navn,
      url: "https://www.statbank.dk/EJ56",
      hentet: new Date().toISOString(),
      status: poster.length ? "ok" : "tom",
      poster,
    };
  },
};
