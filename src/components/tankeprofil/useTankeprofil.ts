"use client";

import { useState, useCallback, useMemo } from "react";
import { CARDS, emptySelections, getTotals, getRanking, type QuadrantKey, type Selections } from "./data";

export type Stage = "intro" | "card" | "teaser" | "report";

// Shuffle once per card per session, persists in memory
type ShuffledCard = { word: string; quadrant: QuadrantKey }[];

export function useTankeprofil() {
  const [stage, setStage] = useState<Stage>("intro");
  const [currentCard, setCurrentCard] = useState(0);
  const [selections, setSelections] = useState<Selections>(emptySelections);
  const [shuffled, setShuffled] = useState<Record<number, ShuffledCard>>({});

  const totals = useMemo(() => getTotals(selections), [selections]);
  const ranking = useMemo(() => getRanking(selections), [selections]);

  const getShuffled = useCallback(
    (cardIndex: number): ShuffledCard => {
      if (shuffled[cardIndex]) return shuffled[cardIndex];
      const card = CARDS[cardIndex];
      const all: ShuffledCard = [];
      (Object.entries(card.words) as [QuadrantKey, string[]][]).forEach(([q, words]) => {
        for (const w of words) all.push({ word: w, quadrant: q });
      });
      const sortedShuffle = all
        .map((item) => ({ item, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ item }) => item);
      setShuffled((prev) => ({ ...prev, [cardIndex]: sortedShuffle }));
      return sortedShuffle;
    },
    [shuffled]
  );

  const toggleWord = useCallback(
    (word: string, quadrant: QuadrantKey) => {
      setSelections((prev) => {
        const next = prev.map((s) => ({ A: [...s.A], B: [...s.B], C: [...s.C], D: [...s.D] }));
        const cardSel = next[currentCard];
        const idx = cardSel[quadrant].indexOf(word);
        const total = cardSel.A.length + cardSel.B.length + cardSel.C.length + cardSel.D.length;
        if (idx >= 0) cardSel[quadrant].splice(idx, 1);
        else if (total < 8) cardSel[quadrant].push(word);
        return next;
      });
    },
    [currentCard]
  );

  const currentCardSelected = useMemo(() => {
    const s = selections[currentCard];
    return s.A.length + s.B.length + s.C.length + s.D.length;
  }, [selections, currentCard]);

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
    setSelections(emptySelections());
    setShuffled({});
    setStage("intro");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return {
    stage,
    setStage,
    currentCard,
    selections,
    totals,
    ranking,
    currentCardSelected,
    getShuffled,
    toggleWord,
    goToCard,
    nextCard,
    prevCard,
    goToReport,
    restart,
  };
}
