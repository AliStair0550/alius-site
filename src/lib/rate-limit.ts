// ============================================================
// Hastighedsgrænse på de ruter et menneske skriver til os igennem
//
// HVORFOR DEN LIGGER HER OG IKKE I HVER RUTE
//
// Fire ruter havde hver sin kopi af den samme funktion, og alle fire
// havde den samme fejl: nøglen blev gemt, men aldrig talt med.
//
//   const count = Array.from(recent.values()).filter(...).length
//
// `values()` er tidsstemplerne. Tællingen så altså på ALLE afsendere
// under ét. Grænsen var tre i minuttet for hele siden, ikke tre pr.
// besøgende. Den fjerde der skrev inden for samme minut fik "du har
// sendt for mange beskeder", selvom det var hans første.
//
// Det er den oversættelse CLAUDE.md forbyder: "en anden var i gang"
// blev til "du sendte for meget". Manden med den rigtige henvendelse
// fik skylden og skrev formentlig ikke igen.
//
// HVAD DER TÆLLES PÅ
//
// Afsenderens adresse, ikke hans e-mail. En robot kan vælge en ny
// e-mail for hver forespørgsel og ville aldrig ramme en grænse der
// talte på den. Adressen kan den ikke vælge.
//
// KAN VI IKKE SE HVEM DET ER
//
// Så slipper vi den igennem og siger det i loggen. At putte alle
// ukendte i den samme spand ville genskabe præcis den fejl der stod
// her før. Honningkrukken er værnet mod robotter; grænsen her er kun
// mod gentagelse.
//
// LEVETID
//
// Kortet ligger i hukommelsen og forsvinder når instansen gør. På
// Vercel betyder det, at grænsen er pr. instans og ikke deles. Den
// er derfor mildere end den ser ud, hvilket er den rigtige vej at
// fejle for en kontaktformular.
// ============================================================

const VINDUE_MS = 60 * 1000;
const MAKS_PR_VINDUE = 3;

/** Loft så kortet ikke kan vokse frit under et angreb. */
const MAKS_NOEGLER = 5000;

const set = new Map<string, number[]>();

export type Graenseudfald =
  /** Under grænsen. Fortsæt. */
  | { tilladt: true; grund: "under_graensen"; brugt: number }
  /** Vi kunne ikke se hvem afsenderen var, så vi lod den passere. */
  | { tilladt: true; grund: "ukendt_afsender"; brugt: 0 }
  /** Denne afsender har skrevet for mange gange i vinduet. */
  | { tilladt: false; grund: "over_graensen"; brugt: number };

/**
 * Afsenderens adresse, som den ser ud bag Vercels proxy.
 *
 * `x-forwarded-for` kan indeholde en kæde. Den første er klienten;
 * resten er mellemled. Returnerer null når ingen af hovederne er sat,
 * hvilket sker lokalt og aldrig i drift.
 */
export function afsenderNoegle(req: Request): string | null {
  const kaede = req.headers.get("x-forwarded-for");
  if (kaede) {
    const foerste = kaede.split(",")[0]?.trim();
    if (foerste) return foerste;
  }
  const direkte = req.headers.get("x-real-ip")?.trim();
  return direkte && direkte.length > 0 ? direkte : null;
}

/**
 * Måler én afsender mod grænsen og noterer forsøget hvis det slipper
 * igennem.
 *
 * `nu` kan sættes af prøverne. I drift står den tom.
 */
export function vurderGraense(
  noegle: string | null,
  nu: number = Date.now(),
  maks: number = MAKS_PR_VINDUE,
  vindueMs: number = VINDUE_MS
): Graenseudfald {
  if (noegle === null) {
    return { tilladt: true, grund: "ukendt_afsender", brugt: 0 };
  }

  const graense = nu - vindueMs;

  // Ryd udløbne. Kun de nøgler der er tomme bagefter forsvinder helt,
  // så en travl afsender ikke nulstilles af en anden afsenders oprydning.
  for (const [k, tider] of set.entries()) {
    const tilbage = tider.filter((t) => t > graense);
    if (tilbage.length === 0) set.delete(k);
    else set.set(k, tilbage);
  }

  const mine = set.get(noegle) ?? [];

  if (mine.length >= maks) {
    return { tilladt: false, grund: "over_graensen", brugt: mine.length };
  }

  // Under pres holder vi op med at notere frem for at æde hukommelse.
  // At slippe igennem er den rigtige måde at fejle på her.
  if (set.size < MAKS_NOEGLER || set.has(noegle)) {
    set.set(noegle, [...mine, nu]);
  }

  return { tilladt: true, grund: "under_graensen", brugt: mine.length + 1 };
}

/** Kun til prøverne. Kortet er ellers privat med vilje. */
export function nulstilGraense(): void {
  set.clear();
}
