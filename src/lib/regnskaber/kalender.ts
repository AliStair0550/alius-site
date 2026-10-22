// ============================================================
// Kommende regnskaber, læst ud af selskabernes finanskalendere
//
// Der findes ingen struktureret kalender. Selskaberne offentliggør deres
// datoer som en børsmeddelelse ("Finanskalender 2027"). De læses her i
// kode, ikke af en model: en dato skal stå ordret i teksten.
//
// Formaterne er forskellige, set 22. oktober 2026:
//   DSV:      "21 April 2027 Interim Financial Report, First Quarter 2027"
//   Mærsk:    "Kvartalsrapport for 3. kvartal den 5. november 2026"
//   ROCKWOOL: "Regnskabsmeddelelse for første halvår 2026 19. august 2026",
//             blandet med "Stilleperiode før 3. kvartal 11. oktober - ..."
//   Demant:   "3. november Periodemeddelelse for Q3 2026", årstallet står
//             kun i overskriften "Finanskalender for 2026"
//   Coloplast: "Venligst se vedlagte pdf". Intet at læse.
//
// Reglen: dokumentets skrivemåde afgøres én gang, ud fra om teksten efter
// eller før datoerne oftest er et regnskab. "den" foran en dato betyder
// altid at begivenheden står før. Datoer i et tidsrum er stilleperioder.
// Stilleperioder, frister, udbytte og generalforsamlinger er ikke
// regnskaber.
//
// Dækningen er ufuldstændig, og det siges: 8 af de 21 selskaber udsender
// separate finanskalendere, og én af dem (Coloplast) kun som PDF. For de
// andre viser kalenderen at datoen ikke er kendt. Den gætter ikke ud fra
// sidste års dato.
//
// Rene funktioner på tekst. Henter intet.
// ============================================================

const MAANEDER: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  januar: 1, februar: 2, marts: 3, maj: 5, juni: 6, juli: 7, oktober: 10,
};

export type Begivenhed = "Årsrapport" | "Halvårsrapport" | "Delårsrapport";

export type KalenderPunkt = { dato: string; begivenhed: Begivenhed; tekst: string };

const IKKE_REGNSKAB = /general ?meeting|generalforsamling|capital markets|kapitalmarkeds|investor day|stilleperiode|quiet period|silent period|closed period|frist|deadline|udbytte|dividend|ex-dato|record date/;

/** Hvad en tekst i kalenderen er. null for alt der ikke er et regnskab. */
export function klassificer(tekst: string): Begivenhed | null {
  const t = tekst.toLowerCase();
  if (IKKE_REGNSKAB.test(t)) return null;
  // "delårsrapport" indeholder "årsrapport"; derfor lookbehind.
  if (/half[- ]year|\bh1\b|halvår|first half|første halvår|\bq2\b|second quarter|2\. kvartal/.test(t)) return "Halvårsrapport";
  if (/interim|delårs|kvartal|quarter|\bq[1-4]\b|trading statement|periodemeddelelse|\b9m\b|nine months|ni måneder|9 måneder|three months/.test(t)) return "Delårsrapport";
  if (/annual report|(?<![a-zæøå])årsrapport|årsregnskab|full[- ]year|helår/.test(t)) return "Årsrapport";
  return null;
}

const MDR = Object.keys(MAANEDER).join("|");
const DATO = new RegExp(`\\b(\\d{1,2})\\.? (${MDR})(?: (20\\d{2}))?\\b`, "gi");

/**
 * Regnskabsdatoer i en finanskalenders tekst. Kun datoer efter `udgivet`
 * og højst 20 måneder frem bruges; resten er historik eller tastefejl.
 */
export function laesKalender(raa: string, udgivet: string): KalenderPunkt[] {
  const t = raa.replace(/\s+/g, " ");
  // Kalenderens år, til datoer skrevet uden årstal (Demant).
  const dokAar = Number(t.match(/(?:finanskalender|financial calendar)(?: for)?(?: \S+)?? (20\d{2})/i)?.[1] ?? NaN);
  const fund = [...t.matchAll(DATO)];
  const fra = Date.parse(`${udgivet.slice(0, 10)}T00:00:00Z`);
  const til = fra + 20 * 31 * 86_400_000;
  // Først hver dato med teksten før og efter, derefter dokumentets
  // skrivemåde: står begivenhederne efter datoerne (DSV, Demant) eller før
  // (ROCKWOOL)? Afgøres for hele dokumentet, ikke dato for dato; ellers
  // låner en generalforsamling den forrige linjes "Årsrapport".
  type Kandidat = { d: Date; foer: string; efter: string; harDen: boolean };
  const kandidater: Kandidat[] = [];
  fund.forEach((m, i) => {
    const dag = Number(m[1]);
    const md = MAANEDER[m[2].toLowerCase()];
    const aar = m[3] ? Number(m[3]) : dokAar;
    if (!Number.isFinite(aar)) return;
    const d = new Date(Date.UTC(aar, md - 1, dag));
    // 31. februar og lignende afvises i stedet for at blive til 3. marts.
    if (d.getUTCMonth() !== md - 1 || d.getUTCDate() !== dag) return;
    const start = m.index!;
    const slut = start + m[0].length;
    const forrigeSlut = i > 0 ? fund[i - 1].index! + fund[i - 1][0].length : Math.max(0, start - 140);
    const naesteStart = i + 1 < fund.length ? fund[i + 1].index! : Math.min(t.length, slut + 140);
    // En begivenhed er én kort linje. Teksten stoppes ved punktum eller
    // fodnotestjerne: Demants sidste linje fortsatte i en fodnote om
    // generalforsamlingen og blev ellers læst som "ikke et regnskab".
    const foer = t.slice(forrigeSlut, start).split(/\.\s|\s\*\s?/).pop()!.trim();
    const efter = t.slice(slut, naesteStart).replace(/^[\s:]+/, "").split(/\.\s|\s\*\s?|\*\s/)[0].trim();
    // En dato i et tidsrum ("11. oktober - 25. november", "13. januar til
    // 2. februar") er en stilleperiode, ikke en begivenhed.
    if (/(?:[-–]|\btil|\bto)$/i.test(foer) || /^(?:[-–]|til\b|to\b)/i.test(efter)) return;
    kandidater.push({ d, foer, efter, harDen: /\bden$/i.test(foer) });
  });
  const hitsEfter = kandidater.filter((k) => !k.harDen && klassificer(k.efter.slice(0, 120))).length;
  const hitsFoer = kandidater.filter((k) => !k.harDen && klassificer(k.foer.slice(-120))).length;
  const efterStil = hitsEfter >= hitsFoer;

  const ud: KalenderPunkt[] = [];
  for (const k of kandidater) {
    if (k.d.getTime() < fra || k.d.getTime() > til) continue;
    const tekst = k.harDen ? k.foer.replace(/\bden$/i, "").trim().slice(-120) : efterStil ? k.efter.slice(0, 120) : k.foer.slice(-120);
    const begivenhed = klassificer(tekst);
    if (begivenhed) ud.push({ dato: k.d.toISOString().slice(0, 10), begivenhed, tekst: tekst.trim() });
  }
  // Samme dato to gange (dansk og engelsk udgave, eller nævnt i brødtekst) er én begivenhed.
  return ud.filter((p, i) => ud.findIndex((q) => q.dato === p.dato) === i);
}
