// ============================================================
// Nøgletal: hvor et tal er på vej hen, ikke bare hvor det står
//
// Ranglisten svarer på "hvad er usædvanligt lige nu". Den er et
// øjebliksbillede og skal være det. De tre nøgletalssider svarer på et
// andet spørgsmål: hvad er retningen, og hvor længe har den holdt.
//
// TRE TAL, IKKE ET
//
//   niveauet      hvor står det nu
//   stribe        hvor mange perioder i træk samme vej
//   året før      hvor står det mod samme periode sidste år
//
// De tre kan modsige hinanden, og det er meningen. En rente kan være
// faldet tre måneder i træk og stadig ligge langt over sidste år.
// Begge dele er sande, og en leder skal se dem samtidig frem for at få
// den ene serveret som konklusionen.
//
// ALT REGNES PÅ MÅNEDER
//
// Valutakurser og elpriser er daglige. "Steget fire dage i træk" er
// støj, ikke retning. Serierne resamples til måneder før striben og
// årsændringen beregnes, præcis som z-scoren gør, så de to sider ikke
// fortæller forskellige historier om samme serie.
//
// Den viste VÆRDI er derimod den seneste faktiske observation. En
// leder der slår dagens dollarkurs op skal se dagens kurs, ikke
// månedens gennemsnit.
// ============================================================

import type { PrismaClient, SeriesFrequency } from "@prisma/client";
import { toMonthlyMedKilde, type Obs } from "./pulse-zscore";
import { hentSerieInfo, hentNationale, type SerieInfo } from "./pulse-model";

/** Hvor mange år kurven og sammenligningen dækker. */
export const VINDUE_AAR = 5;

/**
 * Hvor stor en ændring der tæller som en bevægelse.
 *
 * Under det er serien flad. Uden en tærskel ville enhver serie have en
 * stribe, fordi to decimaler aldrig er præcis ens, og "steget ni
 * måneder i træk" ville betyde ingenting.
 *
 * Relativ til seriens eget niveau, ikke absolut: en rente på 3,4 og et
 * indeks på 130 bevæger sig i vidt forskellige skridt.
 */
export const FLAD_ANDEL = 0.001;

export type Retning = "op" | "ned" | "flad";

export type Noegletal = {
  serie: SerieInfo;
  /** Seneste faktiske observation, ikke månedsgennemsnittet. */
  vaerdi: number;
  periode: Date;
  /** Retningen for den seneste måned mod måneden før. */
  retning: Retning;
  /** Hvor mange måneder i træk samme retning, inklusive den seneste. */
  stribe: number;
  /** Ændring mod samme måned året før. Null når historikken ikke rækker. */
  aaretFoer: number | null;
  /**
   * Niveauet samme måned året før.
   *
   * Ligger med, så visningen kan skrive ændringen som en procent uden
   * at regne baglæns. "61.616 m2 lavere" er et databasetal; "27 procent
   * lavere" er oplysningen, og den kræver grundlaget.
   */
  aaretFoerNiveau: number | null;
  /** Månedsværdier til kurven, ældst først. */
  kurve: Array<{ periode: Date; vaerdi: number }>;
  /**
   * Hvor mange år tilbage man skal for at finde noget lige så højt
   * eller lavt. Null når værdien ikke er en yderlighed i vinduet.
   */
  yderlighedAar: number | null;
  /** Er yderligheden en top eller en bund. */
  yderlighedRetning: "top" | "bund" | null;
};

/** Ingen data er ikke et nøgletal på nul. Serien siger hvorfor. */
export type NoegletalFejl = {
  seriesId: string;
  navn: string | null;
  grund: string;
};

export type NoegletalResultat = {
  tal: Noegletal[];
  udeladte: NoegletalFejl[];
  /** Nyeste hentetidspunkt på tværs af de viste serier. */
  hentet: Date | null;
};

const maanedNoegle = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth();
const fraNoegle = (k: number) => new Date(Date.UTC(Math.floor(k / 12), k % 12, 1));

/**
 * Retning mellem to værdier, med en dødzone i midten.
 *
 * Dødzonen måles mod niveauet, så den betyder det samme for en rente
 * på 3,4 og et indeks på 130.
 */
export function retningMellem(fra: number, til: number): Retning {
  const graense = Math.abs(fra) * FLAD_ANDEL;
  if (til - fra > graense) return "op";
  if (fra - til > graense) return "ned";
  return "flad";
}

/**
 * Hvor mange måneder i træk serien er gået samme vej.
 *
 * Tælles baglæns fra den seneste. En flad måned bryder striben: den er
 * hverken en fortsættelse eller en vending, og at tælle den med ville
 * gøre "steget fem måneder i træk" til en påstand der ikke holder.
 */
export function beregnStribe(vaerdier: number[]): { retning: Retning; stribe: number } {
  if (vaerdier.length < 2) return { retning: "flad", stribe: 0 };

  const sidste = retningMellem(
    vaerdier[vaerdier.length - 2],
    vaerdier[vaerdier.length - 1]
  );
  if (sidste === "flad") {
    // Tæl hvor længe den har ligget stille.
    let n = 1;
    for (let i = vaerdier.length - 2; i > 0; i--) {
      if (retningMellem(vaerdier[i - 1], vaerdier[i]) !== "flad") break;
      n++;
    }
    return { retning: "flad", stribe: n };
  }

  let n = 1;
  for (let i = vaerdier.length - 2; i > 0; i--) {
    if (retningMellem(vaerdier[i - 1], vaerdier[i]) !== sidste) break;
    n++;
  }
  return { retning: sidste, stribe: n };
}

/**
 * Hvor langt tilbage man skal for at finde noget lige så yderligtgående.
 *
 * Returnerer antal år, afrundet nedad, eller null hvis værdien ikke er
 * en yderlighed i vinduet. Bruges frem for en z-score, fordi "højeste i
 * tre år" kan efterprøves af en læser der kigger på kurven.
 */
export function beregnYderlighed(
  maanedlige: Array<{ noegle: number; vaerdi: number }>
): { aar: number; retning: "top" | "bund" } | null {
  if (maanedlige.length < 13) return null;

  const sidst = maanedlige[maanedlige.length - 1];
  const tidligere = maanedlige.slice(0, -1);

  const erTop = tidligere.every((m) => m.vaerdi <= sidst.vaerdi);
  const erBund = tidligere.every((m) => m.vaerdi >= sidst.vaerdi);
  if (!erTop && !erBund) return null;

  // Hvor langt tilbage vinduet rækker. "Højeste i fem år" må ikke
  // siges om en serie vi kun har tre år af.
  const maaneder = sidst.noegle - maanedlige[0].noegle;
  const aar = Math.floor(maaneder / 12);
  if (aar < 1) return null;

  return { aar, retning: erTop ? "top" : "bund" };
}

/**
 * Regner nøgletallet for én serie.
 *
 * Null betyder at der ikke er nok til at sige noget. Aldrig et nøgletal
 * med nuller i, som ville se ud som en serie der lå stille.
 */
export function beregnNoegletal(
  serie: SerieInfo,
  punkter: Array<{ periode: Date; vaerdi: number }>,
  nu: Date = new Date()
): Noegletal | { fejl: string } {
  if (punkter.length === 0) return { fejl: "Ingen observationer i basen." };

  const vinduesStart = new Date(
    Date.UTC(nu.getUTCFullYear() - VINDUE_AAR, nu.getUTCMonth(), 1)
  );
  const iVindue = punkter.filter((p) => p.periode >= vinduesStart);
  if (iVindue.length === 0) {
    const nyeste = punkter[punkter.length - 1].periode.toISOString().slice(0, 7);
    return { fejl: `Ingen tal i de seneste ${VINDUE_AAR} år. Nyeste er ${nyeste}.` };
  }

  const obs: Obs[] = iVindue.map((p) => ({ period: p.periode, value: p.vaerdi }));
  const { udfyldt: maanedligt, aegte } = toMonthlyMedKilde(obs);

  // Striben, årsændringen og yderligheden regnes kun på ÆGTE måneder.
  //
  // En kvartalsserie båret frem til månedlig frekvens har to kopier af
  // hver værdi. Sammenlignes de måned for måned, er to ud af tre
  // skridt per definition uændrede, og striben måler så resamplingen
  // i stedet for serien. Lønindekset ville stå som "uændret" hver
  // eneste gang, uanset hvad lønnen gjorde.
  //
  // Kurven tegnes derimod på den udfyldte serie, så en kvartalsserie
  // ikke ser ud til at have tre gange så få observationer som den har
  // perioder.
  const alleNoegler = [...maanedligt.keys()].sort((a, b) => a - b);
  const noegler = alleNoegler.filter((k) => aegte.has(k));

  if (noegler.length < 2) {
    return { fejl: "For få perioder til at sige noget om retningen." };
  }

  const maanedlige = noegler.map((k) => ({ noegle: k, vaerdi: maanedligt.get(k)! }));
  const vaerdier = maanedlige.map((m) => m.vaerdi);

  const { retning, stribe } = beregnStribe(vaerdier);

  const sidsteNoegle = noegler[noegler.length - 1];
  // Samme måned året før skal også være en ægte observation. Ellers
  // sammenlignes med en fremskrivning, og ændringen måler udfyldningen.
  const aaretFoerVaerdi = aegte.has(sidsteNoegle - 12)
    ? maanedligt.get(sidsteNoegle - 12)
    : undefined;
  const aaretFoer =
    aaretFoerVaerdi === undefined
      ? null
      : vaerdier[vaerdier.length - 1] - aaretFoerVaerdi;
  const aaretFoerNiveau = aaretFoerVaerdi ?? null;

  const yder = beregnYderlighed(maanedlige);

  // Den viste værdi er den seneste FAKTISKE observation. En daglig
  // serie skal vise dagens tal, ikke månedens gennemsnit.
  const sidstePunkt = iVindue[iVindue.length - 1];

  return {
    serie,
    vaerdi: sidstePunkt.vaerdi,
    periode: sidstePunkt.periode,
    retning,
    stribe,
    aaretFoer,
    aaretFoerNiveau,
    kurve: alleNoegler.map((k) => ({
      periode: fraNoegle(k),
      vaerdi: maanedligt.get(k)!,
    })),
    yderlighedAar: yder?.aar ?? null,
    yderlighedRetning: yder?.retning ?? null,
  };
}

/**
 * Henter og beregner nøgletal for en liste af serier, i den rækkefølge
 * de er givet. Rækkefølgen er redaktionel og skal ikke sorteres om.
 */
export async function hentNoegletal(
  prisma: PrismaClient,
  ids: string[],
  nu: Date = new Date()
): Promise<NoegletalResultat> {
  const tal: Noegletal[] = [];
  const udeladte: NoegletalFejl[] = [];
  let hentet: Date | null = null;

  for (const id of ids) {
    const serie = await hentSerieInfo(prisma, id);
    if (!serie) {
      // Serien findes ikke. Ikke det samme som en serie uden tal, og
      // siden skal ikke vise et hul der ligner en rolig måned.
      udeladte.push({
        seriesId: id,
        navn: null,
        grund: "Serien findes ikke i basen. Kør backfill for den.",
      });
      continue;
    }

    const punkter = (
      await hentNationale(prisma, id, serie.frequency as SeriesFrequency)
    ).map((p) => ({ periode: p.periodDate, vaerdi: p.value! }));

    const n = beregnNoegletal(serie, punkter, nu);
    if ("fejl" in n) {
      udeladte.push({ seriesId: id, navn: serie.nameDa, grund: n.fejl });
      continue;
    }

    tal.push(n);
    if (serie.hentet && (!hentet || serie.hentet > hentet)) hentet = serie.hentet;
  }

  return { tal, udeladte, hentet };
}
