"use client";

import { useState, useCallback, useMemo } from "react";
import { CARDS, type QuadrantKey, type Totals } from "./data";
import { getQuartetsForCard } from "./quartets";
import { calculateTotalsFromQuartets, normalizeTotals, type QuartetAnswer } from "./scoring";

export type Stage = "intro" | "card" | "teaser" | "report";

export function useTankeprofil() {
  const [stage, setStage] = useState<Stage>("intro");
  const [currentCard, setCurrentCard] = useState(0);
  const [answers, setAnswers] = useState<QuartetAnswer[]>([]);

  const totals = useMemo((): Totals => {
    return normalizeTotals(calculateTotalsFromQuartets(answers));
  }, [answers]);

  const ranking = useMemo(() => {
    const sum = totals.A + totals.B + totals.C + totals.D;
    const pct: Totals = {
      A: sum > 0 ? totals.A / sum : 0,
      B: sum > 0 ? totals.B / sum : 0,
      C: sum > 0 ? totals.C / sum : 0,
      D: sum > 0 ? totals.D / sum : 0,
    };
    const ranked = (Object.entries(totals) as [QuadrantKey, number][]).sort(
      (a, b) => b[1] - a[1]
    );
    return {
      totals,
      pct,
      ranked,
      primary: ranked[0][0],
      secondary: ranked[1][0],
      weakest: ranked[3][0],
    };
  }, [totals]);

  const setAnswer = useCallback(
    (quartetId: string, best: QuadrantKey, worst: QuadrantKey) => {
      setAnswers((prev) => {
        const next = prev.filter((a) => a.quartetId !== quartetId);
        return [...next, { quartetId, best, worst }];
      });
    },
    []
  );

  const getAnswer = useCallback(
    (quartetId: string): QuartetAnswer | undefined => {
      return answers.find((a) => a.quartetId === quartetId);
    },
    [answers]
  );

  const currentCardQuartets = useMemo(
    () => getQuartetsForCard(currentCard),
    [currentCard]
  );

  const currentCardAnsweredCount = useMemo(() => {
    const ids = new Set(currentCardQuartets.map((q) => q.id));
    return answers.filter((a) => ids.has(a.quartetId)).length;
  }, [answers, currentCardQuartets]);

  const goToCard = useCallback((idx: number) => {
    setCurrentCard(idx);
    setStage("card");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const nextCard = useCallback(() => {
    if (currentCard < CARDS.length - 1) {
      setCurrentCard((c) => c + 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setStage("teaser");
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentCard]);

  const prevCard = useCallback(() => {
    if (currentCard > 0) {
      setCurrentCard((c) => c - 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentCard]);

  const goToReport = useCallback(() => {
    setStage("report");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const restart = useCallback(() => {
    setCurrentCard(0);
    setAnswers([]);
    setStage("intro");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return {
    stage,
    setStage,
    currentCard,
    answers,
    totals,
    ranking,
    currentCardQuartets,
    currentCardAnsweredCount,
    setAnswer,
    getAnswer,
    goToCard,
    nextCard,
    prevCard,
    goToReport,
    restart,
  };
}
