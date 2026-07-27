"use client";

import { useEffect, useRef, useState } from "react";

const TOTAL = 6;
// SSR/no-JS: kortet vises halvt stemplet som en rolig, statisk illustration.
// Med JS nulstilles det til tomt og bliver interaktivt (se useEffect).
const SSR_FILLED = 3;

export function Kaffekort() {
  const [count, setCount] = useState(SSR_FILLED);
  const [jsReady, setJsReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCount(0);
    setJsReady(true);
  }, []);

  const full = count >= TOTAL;

  function stamp() {
    setCount((c) => (c >= TOTAL ? c : c + 1));
  }

  function reset() {
    setCount(0);
    cardRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.key === "Enter" || e.key === " ") && !full) {
      e.preventDefault();
      stamp();
    }
  }

  return (
    <div className="not-prose my-2 flex flex-col items-center">
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-label={
          full
            ? "Kaffekort. Alle 6 stempler samlet. Gratis kaffe låst op."
            : `Kaffekort. ${count} af ${TOTAL} stempler. Tryk for at stemple.`
        }
        onClick={() => !full && stamp()}
        onKeyDown={onKeyDown}
        className={`w-full max-w-[380px] select-none rounded-[22px] border border-ink/15 bg-[#FCFBF8] p-7 md:p-8 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-moss/50 ${
          full ? "cursor-default" : "cursor-pointer"
        }`}
      >
        {/* Header */}
        <div className="flex items-baseline justify-between mb-7">
          <div>
            <div className="font-fraunces text-[1.35rem] leading-none text-ink">Kaffekortet</div>
            <div className="mt-2 font-[200] text-[0.8rem] text-slate tracking-[0.02em]">
              6 stempler = 1 gratis kaffe
            </div>
          </div>
          <div className="font-[300] text-[0.72rem] tracking-[0.18em] uppercase text-slate/70 tabular-nums">
            {count}/{TOTAL}
          </div>
        </div>

        {/* Seks stempelpladser - to rækker a tre */}
        <div className="grid grid-cols-3 gap-4 md:gap-5 justify-items-center">
          {Array.from({ length: TOTAL }).map((_, i) => {
            const on = i < count;
            return (
              <span
                key={i}
                role="img"
                aria-label={`Stempel ${i + 1} af ${TOTAL}${on ? ", stemplet" : ", tomt"}`}
                className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full border border-ink/70"
              >
                {on && (
                  <span
                    className={`absolute inset-0 flex items-center justify-center rounded-full bg-moss ${
                      jsReady ? "kaffe-stamp-in" : ""
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-1/2 w-1/2" aria-hidden="true">
                      <path
                        className={jsReady ? "kaffe-check" : ""}
                        d="M5 12.5 L10 17.5 L19 7"
                        pathLength={1}
                        stroke="#FAF8F4"
                        strokeWidth={2.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {/* Kortets bund: belønningslinje ved sjette stempel */}
        <div
          className={`mt-7 flex items-center gap-3 rounded-[12px] px-4 transition-colors duration-500 ${
            full ? "bg-moss py-3.5" : "py-0"
          }`}
        >
          {full && (
            <div className={`flex items-center gap-3 ${jsReady ? "kaffe-reward-in" : ""}`}>
              {/* Rolig kaffekop-markering */}
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 flex-shrink-0" aria-hidden="true">
                <path
                  d="M4 8 h12 v5 a5 5 0 0 1 -5 5 H9 a5 5 0 0 1 -5 -5 Z M16 9 h2.5 a2.5 2.5 0 0 1 0 5 H16"
                  stroke="#FAF8F4"
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                />
                <path d="M7 3.5 v2 M10.5 3.5 v2" stroke="#FAF8F4" strokeWidth={1.4} strokeLinecap="round" />
              </svg>
              <span className="font-[400] text-[0.9rem] tracking-[0.01em] text-parchment">
                1 gratis kaffe låst op
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Diskret hjælpetekst / nulstil */}
      <div className="mt-4 h-5 text-center">
        {full ? (
          <button
            type="button"
            onClick={reset}
            className="font-[300] text-[0.72rem] tracking-[0.18em] uppercase text-slate hover:text-moss transition-colors cursor-pointer"
          >
            Nulstil
          </button>
        ) : (
          <p className="font-[200] text-[0.78rem] text-slate/70 tracking-[0.02em]">
            Klik på kortet for at stemple
          </p>
        )}
      </div>

      {/* Skærmlæser-annoncering af fremdrift */}
      <p aria-live="polite" className="sr-only">
        {full ? "Gratis kaffe låst op" : `${count} af ${TOTAL} stempler`}
      </p>
    </div>
  );
}
