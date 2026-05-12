import type { QuadrantKey, Totals } from "./data";

export type QuartetAnswer = {
  quartetId: string;
  best: QuadrantKey;
  worst: QuadrantKey;
};

export function calculateTotalsFromQuartets(answers: QuartetAnswer[]): Totals {
  const totals: Totals = { A: 0, B: 0, C: 0, D: 0 };
  for (const answer of answers) {
    totals[answer.best] += 2;
    totals[answer.worst] -= 1;
  }
  return totals;
}

// Shift all values up so the minimum is 0 — preserves relative gaps
export function normalizeTotals(totals: Totals): Totals {
  const min = Math.min(totals.A, totals.B, totals.C, totals.D);
  const offset = min < 0 ? Math.abs(min) : 0;
  return {
    A: totals.A + offset,
    B: totals.B + offset,
    C: totals.C + offset,
    D: totals.D + offset,
  };
}
