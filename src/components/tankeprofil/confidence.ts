import type { QuadrantKey, Totals } from "./data";

export type ProfileLabel =
  | "tydelig"
  | "tendens"
  | "bred"
  | "balanceret";

export type ProfileClarity = {
  primaryConfidence: number;
  profileClarity: number;
  label: ProfileLabel;
};

export function calculateClarity(totals: Totals, primary: QuadrantKey): ProfileClarity {
  const values = [totals.A, totals.B, totals.C, totals.D];
  const sum = values.reduce((a, b) => a + b, 0);

  if (sum === 0) {
    return { primaryConfidence: 0, profileClarity: 0, label: "balanceret" };
  }

  const sorted = [...values].sort((a, b) => b - a);
  const top = sorted[0];
  const second = sorted[1];

  // How far ahead is the primary vs second place?
  const ratio = second > 0 ? top / second : 2;
  const primaryConfidence = Math.min(1, Math.max(0, ratio - 1));

  // How spread is the distribution from a flat 25%/25%/25%/25%?
  const pcts = values.map((v) => v / sum);
  const variance = pcts.reduce((acc, p) => acc + (p - 0.25) ** 2, 0) / 4;
  const stdDev = Math.sqrt(variance);
  // Max stdDev (all in one quadrant) = sqrt(3/16) ≈ 0.433
  const profileClarity = Math.min(1, stdDev / 0.433);

  let label: ProfileLabel;
  if (primaryConfidence >= 0.5 && profileClarity >= 0.4) {
    label = "tydelig";
  } else if (primaryConfidence >= 0.3) {
    label = "tendens";
  } else if (profileClarity >= 0.2) {
    label = "bred";
  } else {
    label = "balanceret";
  }

  return { primaryConfidence, profileClarity, label };
}

export function clarityQualifier(label: ProfileLabel): string {
  switch (label) {
    case "tydelig": return "Tydelig";
    case "tendens": return "Du hælder mod";
    case "bred": return "Bred profil med";
    case "balanceret": return "Du tænker bredt";
  }
}

export function clarityDescription(label: ProfileLabel): string {
  switch (label) {
    case "tydelig":
      return "Din tænkning har et klart tyngdepunkt. Det gør dig forudsigelig på den gode måde. Dine kollegaer ved hvad de kan trække på hos dig.";
    case "tendens":
      return "Du hælder tydeligt mod denne kvadrant, men profilen er ikke ekstrem. Det giver dig fleksibilitet til at trække på andre tænkemåder når det er nødvendigt.";
    case "bred":
      return "Du har en bred profil med en mild præference. Du er fleksibel og kan operere komfortabelt på tværs af tænkemåder, men det kan gøre det sværere for andre at forudsige hvor du står.";
    case "balanceret":
      return "Din tænkning fordeler sig næsten ligeligt. Det er sjældent og kan være en stor styrke. Du oversætter naturligt mellem perspektiver og forstår mange typer kollegaer.";
  }
}
