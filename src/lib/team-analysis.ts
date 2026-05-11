import type { QuadrantKey } from "@/components/tankeprofil/data";

export type { QuadrantKey };

export type Participant = {
  id: string;
  name: string;
  totals: { A: number; B: number; C: number; D: number };
  primary: QuadrantKey;
  secondary: QuadrantKey;
  weakest: QuadrantKey;
  accessToken: string;
};

export type DiagonalTension = {
  pair: [QuadrantKey, QuadrantKey];
  countA: number;
  countB: number;
  severity: "low" | "medium" | "high";
  label: string;
  description: string;
};

export type TeamClassification =
  | "balanced"
  | "dominant"
  | "polarized"
  | "uniform"
  | "partial";

export type TeamAnalysis = {
  participants: Participant[];
  aggregateTotals: { A: number; B: number; C: number; D: number };
  aggregatePrimary: QuadrantKey;
  aggregateSecondary: QuadrantKey;
  aggregateWeakest: QuadrantKey;
  primaryCounts: Record<QuadrantKey, number>;
  primaryPct: Record<QuadrantKey, number>;
  dominantQuadrants: QuadrantKey[];
  blindQuadrants: QuadrantKey[];
  tensions: DiagonalTension[];
  observations: string[];
  classification: TeamClassification;
  classificationLabel: string;
  classificationDescription: string;
};

const LABELS: Record<QuadrantKey, string> = {
  A: "Analytiker",
  B: "Bygmester",
  C: "Forbinder",
  D: "Visionær",
};

const ADJ: Record<QuadrantKey, string> = {
  A: "analytisk",
  B: "struktureret",
  C: "relationel",
  D: "visionær",
};

const QUADS: QuadrantKey[] = ["A", "B", "C", "D"];

export function analyzeTeam(participants: Participant[]): TeamAnalysis {
  const n = participants.length;
  const zero = { A: 0, B: 0, C: 0, D: 0 };

  if (n === 0) {
    return {
      participants: [],
      aggregateTotals: { ...zero },
      aggregatePrimary: "A",
      aggregateSecondary: "B",
      aggregateWeakest: "D",
      primaryCounts: { ...zero },
      primaryPct: { ...zero },
      dominantQuadrants: [],
      blindQuadrants: [...QUADS],
      tensions: [],
      observations: [],
      classification: "partial",
      classificationLabel: "Ingen data",
      classificationDescription: "Ingen deltagere har udfyldt profilen endnu.",
    };
  }

  // Aggregate totals
  const agg = { A: 0, B: 0, C: 0, D: 0 };
  for (const p of participants) {
    agg.A += p.totals.A;
    agg.B += p.totals.B;
    agg.C += p.totals.C;
    agg.D += p.totals.D;
  }

  const ranked = QUADS.map((q) => ({ q, v: agg[q] })).sort((a, b) => b.v - a.v);
  const aggregatePrimary = ranked[0].q;
  const aggregateSecondary = ranked[1].q;
  const aggregateWeakest = ranked[3].q;

  const primaryCounts = { A: 0, B: 0, C: 0, D: 0 } as Record<QuadrantKey, number>;
  for (const p of participants) primaryCounts[p.primary]++;

  const primaryPct = {
    A: primaryCounts.A / n,
    B: primaryCounts.B / n,
    C: primaryCounts.C / n,
    D: primaryCounts.D / n,
  } as Record<QuadrantKey, number>;

  const dominantQuadrants = QUADS.filter((q) => primaryPct[q] >= 0.4);
  const blindQuadrants = QUADS.filter((q) => primaryCounts[q] === 0);
  const qRep = QUADS.filter((q) => primaryCounts[q] > 0).length;

  // Diagonal tensions
  const tensions: DiagonalTension[] = [];

  function addTension(
    qa: QuadrantKey,
    qb: QuadrantKey,
    label: string,
    desc: string
  ) {
    const ca = primaryCounts[qa];
    const cb = primaryCounts[qb];
    if (ca === 0 || cb === 0) return;
    const ratio = Math.min(ca, cb) / Math.max(ca, cb);
    const severity: DiagonalTension["severity"] =
      ratio >= 0.6 ? "high" : ratio >= 0.3 ? "medium" : "low";
    tensions.push({ pair: [qa, qb], countA: ca, countB: cb, severity, label, description: desc });
  }

  addTension(
    "A", "C",
    "Analyse mod relation",
    `${primaryCounts.A} ${primaryCounts.A === 1 ? "person" : "personer"} tænker primært analytisk; ` +
    `${primaryCounts.C} primært relationelt. De to tendenser trækker i modsatte retninger.`
  );

  addTension(
    "B", "D",
    "Struktur mod vision",
    `${primaryCounts.B} ${primaryCounts.B === 1 ? "person" : "personer"} tænker primært i systemer; ` +
    `${primaryCounts.D} i muligheder og fremtid. En potentielt stærk modsætning.`
  );

  // Dynamic observations
  const observations: string[] = [];

  for (const q of dominantQuadrants) {
    const pct = Math.round(primaryPct[q] * 100);
    observations.push(
      `${pct}% af holdet tænker primært ${ADJ[q]} — ${LABELS[q]}-profilen dominerer.`
    );
  }

  for (const q of blindQuadrants) {
    observations.push(
      `Ingen har ${LABELS[q]} som primær styrke. ${
        q === "A" ? "Analytisk" : q === "B" ? "Struktureret" : q === "C" ? "Relationel" : "Visionær"
      } tænkning er et kollektivt blindt felt.`
    );
  }

  if (qRep === 4 && dominantQuadrants.length === 0) {
    observations.push(
      "Alle fire tænkemåder er repræsenteret. Det giver en naturlig modvægt mod ensretning."
    );
  }

  const leftBrain = primaryCounts.A + primaryCounts.B;
  const rightBrain = primaryCounts.C + primaryCounts.D;
  if (leftBrain > 0 && rightBrain === 0) {
    observations.push(
      "Hele holdet tænker analytisk og struktureret. Den relationelle og visionære halvdel er fuldstændig stille."
    );
  } else if (rightBrain > 0 && leftBrain === 0) {
    observations.push(
      "Hele holdet tænker relationelt og visionært. Den analytiske og strukturerede halvdel er stille."
    );
  }

  if (tensions.some((t) => t.severity === "high") && n >= 4) {
    observations.push(
      "Holdet har en markant diagonal spænding. Det kan skabe kreativ friktion — eller fastlåste mønstre."
    );
  }

  // Classification
  let classification: TeamClassification;
  let classificationLabel: string;
  let classificationDescription: string;

  const topPct = dominantQuadrants.length > 0 ? primaryPct[dominantQuadrants[0]] : 0;

  if (n < 2) {
    classification = "partial";
    classificationLabel = "Delvis";
    classificationDescription =
      "For få deltagere til et fuldt billede. Rapporten opdateres automatisk som flere tilmelder sig.";
  } else if (topPct >= 0.6 && qRep === 1) {
    classification = "uniform";
    classificationLabel = "Ensartet";
    classificationDescription =
      "Alle deltagere deler primær kvadrant. Holdet er stærkt og sammenhængende — men perspektivbredden er smal.";
  } else if (topPct >= 0.6) {
    classification = "dominant";
    classificationLabel = "Dominerende";
    classificationDescription =
      "Over halvdelen deler primær kvadrant. Det giver styrke og fælles forståelse — men reducerer bredden af naturlige perspektiver.";
  } else if (tensions.some((t) => t.severity === "high")) {
    classification = "polarized";
    classificationLabel = "Polariseret";
    classificationDescription =
      "Holdet er splittet langs en diagonal akse. Det kan skabe komplementære styrker — eller fastlåste konflikter.";
  } else if (qRep === 4 && Math.max(...QUADS.map((q) => primaryPct[q])) < 0.45) {
    classification = "balanced";
    classificationLabel = "Balanceret";
    classificationDescription =
      "Holdet har en naturlig fordeling på tværs af alle fire kvadranter. Alle perspektiver er til stede.";
  } else {
    classification = "partial";
    classificationLabel = "Nuanceret";
    classificationDescription =
      "Holdet viser klare styrker i enkelte kvadranter og blinde vinkler i andre.";
  }

  return {
    participants,
    aggregateTotals: agg,
    aggregatePrimary,
    aggregateSecondary,
    aggregateWeakest,
    primaryCounts,
    primaryPct,
    dominantQuadrants,
    blindQuadrants,
    tensions,
    observations,
    classification,
    classificationLabel,
    classificationDescription,
  };
}
