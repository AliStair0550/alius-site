"use client";

import { useEffect, useState } from "react";
import AliusLogo from "./AliusLogo";

const links = [
  { href: "#ydelser", label: "Ydelser" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#vaerktoejer", label: "Vaerktoejer" },
  { href: "#om", label: "Om" },
  { href: "#kontakt", label: "Kontakt" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-5 transition-all duration-300 backdrop-blur-[14px] ${
        scrolled
          ? "border-b border-fog bg-parchment/95"
          : "border-b border-transparent bg-parchment/90"
      }`}
    >
      <a href="#">
        <AliusLogo width={80} />
      </a>
      <ul className="hidden md:flex gap-8">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="font-[100] text-[0.78rem] tracking-[0.1em] uppercase text-slate hover:text-ink transition-colors"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
