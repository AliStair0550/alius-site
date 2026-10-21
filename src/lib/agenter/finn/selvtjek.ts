// ============================================================
// Selvtjek: hvert tal i briefen skal kunne spores
//
// Kontrollen er kode, ikke en model. En model kan love at holde
// reglen om ikke at finde på tal og alligevel bryde den, og et
// opdigtet tal i en brief er præcis den plausible forkerte værdi
// CLAUDE.md advarer mod: "ledigheden steg til 2,9 procent" ligner
// en oplysning, uanset om den er sand.
//
// Reglen er streng: et tal i et punkt skal findes i de poster PUNKTET
// SELV henviser til. At tallet står et andet sted i dagens data, er
// ikke nok; så kunne et rigtigt tal blive sat på en forkert påstand.
//
// Afrunding er tilladt. 2,2 må skrives som 2, men ikke som 3.
// ============================================================

import type { Post } from "../kilder/typer";

export type TalFund = { raa: string; vaerdi: number; decimaler: number };

/**
 * Tal i dansk skrivemåde: 1.234,5 og 2,20 og 7. Tal der hænger sammen
 * med bogstaver (DK1, G47, Covid-19 er dog bindestreg) er navne, ikke
 * tal, og tælles ikke.
 */
export function talITekst(tekst: string): TalFund[] {
  const ud: TalFund[] = [];
  const re = /(?<![\p{L}\d.,])[+-]?\d{1,3}(?:\.\d{3})+(?:,\d+)?(?![\p{L}\d])|(?<![\p{L}\d.,])[+-]?\d+(?:,\d+)?(?![\p{L}\d])/gu;
  for (const m of tekst.matchAll(re)) {
    const raa = m[0];
    const norm = raa.replace(/\./g, "").replace(",", ".");
    const v = Number(norm);
    if (!Number.isFinite(v)) continue;
    const dec = norm.includes(".") ? norm.split(".")[1].length : 0;
    ud.push({ raa, vaerdi: v, decimaler: dec });
  }
  return ud;
}

/** Alle tal en post legitimerer. */
export function tilladteTal(post: Post): number[] {
  const tal: number[] = [];
  const fraTekst = (t: string | null | undefined) => t && tal.push(...talITekst(t).map((f) => f.vaerdi));
  if (post.type === "tal") {
    tal.push(post.vaerdi);
    fraTekst(post.navn);
    fraTekst(post.periode);
    // Året før perioden: "højere end i september 2025" er en korrekt
    // beskrivelse af en ændring år/år, og et årstal kan ikke forklæde sig
    // som et måltal.
    for (const f of talITekst(post.periode)) if (f.vaerdi >= 1990 && f.vaerdi <= 2100) tal.push(f.vaerdi - 1);
    for (const f of post.forloeb) {
      tal.push(f.vaerdi);
      fraTekst(f.periode);
    }
    if (post.sammenligning) {
      const s = post.sammenligning;
      tal.push(s.aendring);
      if (s.vaerdi !== null) tal.push(s.vaerdi);
      fraTekst(s.periode);
    }
  } else {
    fraTekst(post.titel);
    const d = new Date(post.dato);
    // Datoen i dansk tid, så "20. oktober" svarer til feedets dato.
    const [aar, md, dag] = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" })
      .format(d)
      .split("-")
      .map(Number);
    tal.push(aar, md, dag);
  }
  return tal;
}

function sporbar(f: TalFund, tilladte: number[]): boolean {
  const tolerance = 0.5 * 10 ** -f.decimaler + 1e-9;
  return tilladte.some((v) => Math.abs(Math.abs(f.vaerdi) - Math.abs(v)) <= tolerance);
}

/** De tal i teksten der IKKE kan spores til posterne. Tom liste = alt i orden. */
export function usporedeTal(tekst: string, poster: Post[]): string[] {
  const tilladte = poster.flatMap(tilladteTal);
  return talITekst(tekst)
    .filter((f) => !sporbar(f, tilladte))
    .map((f) => f.raa);
}

/** Modellen skriver af og til feltets navn foran indholdet. Siden sætter det selv. */
export function udenPraefiks(tekst: string): string {
  return tekst.replace(/^\s*hvad det betyder\s*[:.\-]\s*/i, "").trim();
}

/**
 * Sproglige regler der kan håndhæves uden en model: ingen tankestreger
 * og ingen udråbstegn. Se CLAUDE.md og Finns regler.
 */
export function rensSprog(tekst: string): string {
  return tekst
    .replace(/\s*[—–]\s*/g, (m) => (m.trim() === m ? "-" : ", "))
    .replace(/!/g, ".")
    .replace(/\.\./g, ".")
    .replace(/\s+,/g, ",")
    .trim();
}
