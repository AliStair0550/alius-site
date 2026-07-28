"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AliusLogo from "./AliusLogo";

const links = [
  { href: "#maskinrummet", label: "Maskinrummet" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#værktøjer", label: "Værktøjer" },
  { href: "#kontakt", label: "Kontakt" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [aaben, setAaben] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const knapRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape lukker, og fokus vender tilbage til knappen. Uden det ville
  // en tastaturbruger stå inde i en menu der ikke er der længere.
  useEffect(() => {
    if (!aaben) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAaben(false);
        knapRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [aaben]);

  // Baggrunden låses mens menuen er åben, så siden ikke ruller bagved.
  useEffect(() => {
    if (!aaben) return;
    const forrige = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = forrige;
    };
  }, [aaben]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 md:px-8 py-5 transition-all duration-300 backdrop-blur-[14px] ${
          scrolled
            ? "border-b border-fog bg-parchment/95"
            : "border-b border-transparent bg-parchment/90"
        }`}
      >
        <Link
          href="/"
          aria-label="Alius, til forsiden"
          className={`transition-opacity duration-300 ${
            // Logoet er skjult i toppen, fordi det store logo står i
            // heroen. Men på mobil skal der være noget at navigere
            // tilbage med, når menuen er åben.
            scrolled || aaben ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <AliusLogo width={80} />
        </Link>

        <ul className="hidden md:flex gap-8">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="font-[300] text-[0.78rem] tracking-[0.1em] uppercase text-slate hover:text-ink transition-colors"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          ref={knapRef}
          type="button"
          onClick={() => setAaben((v) => !v)}
          aria-expanded={aaben}
          aria-controls="mobilmenu"
          aria-label={aaben ? "Luk menu" : "Åbn menu"}
          // 44px højt og bredt: det er hvad en tommelfinger kan ramme.
          className="md:hidden -mr-2 w-11 h-11 flex flex-col justify-center items-end gap-[5px] group"
        >
          <span
            className={`block h-px bg-ink transition-all duration-300 ${
              aaben ? "w-6 translate-y-[6px] rotate-45" : "w-6"
            }`}
          />
          <span
            className={`block h-px bg-ink transition-all duration-300 ${
              aaben ? "opacity-0 w-6" : "w-4 group-hover:w-6"
            }`}
          />
          <span
            className={`block h-px bg-ink transition-all duration-300 ${
              aaben ? "w-6 -translate-y-[6px] -rotate-45" : "w-6"
            }`}
          />
        </button>
      </nav>

      {/* Panelet ligger under navlinjen og dækker resten af skærmen. */}
      <div
        id="mobilmenu"
        hidden={!aaben}
        className={`md:hidden fixed inset-0 top-[73px] z-40 bg-parchment transition-opacity duration-300 ${
          aaben ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div ref={panelRef} className="px-6 pt-10 pb-12 flex flex-col h-full">
          <ul className="list-none p-0 m-0 flex flex-col">
            {links.map((l, i) => (
              <li key={l.href} className="border-b border-fog">
                <a
                  href={l.href}
                  onClick={() => setAaben(false)}
                  className="block py-5 font-[300] text-[1.15rem] tracking-[0.02em] text-ink no-underline hover:text-moss transition-colors"
                  style={{
                    animation: aaben
                      ? `fadeUp 380ms ease-out ${80 + i * 55}ms both`
                      : undefined,
                  }}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <Link
            href="/kontakt"
            onClick={() => setAaben(false)}
            className="mt-8 inline-flex justify-center font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-7 py-4 bg-ink text-parchment border border-ink hover:bg-moss hover:border-moss transition-all no-underline"
            style={{
              animation: aaben
                ? `fadeUp 380ms ease-out ${80 + links.length * 55}ms both`
                : undefined,
            }}
          >
            Tag en snak
          </Link>

          <span className="mt-auto pt-10 font-[200] text-[0.7rem] text-stone tracking-[0.05em]">
            hej@alius.dk
          </span>
        </div>
      </div>
    </>
  );
}
