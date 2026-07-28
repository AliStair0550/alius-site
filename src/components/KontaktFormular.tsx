"use client";

import { useState } from "react";
import Link from "next/link";

type Tilstand =
  | { slags: "klar" }
  | { slags: "sender" }
  | { slags: "sendt" }
  | { slags: "fejl"; besked: string };

/**
 * Kontaktformularen.
 *
 * Tre felter plus et valgfrit. Hver ekstra rubrik koster en besked, og
 * vi kan spørge om resten når samtalen er i gang.
 *
 * Tilstanden er en af fire, aldrig en blanding. En knap der både siger
 * "sender" og viser en fejl fra sidste forsøg er den slags der får en
 * bruger til at sende to gange.
 */
export default function KontaktFormular() {
  const [tilstand, setTilstand] = useState<Tilstand>({ slags: "klar" });

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (tilstand.slags === "sender") return;

    const f = new FormData(e.currentTarget);
    setTilstand({ slags: "sender" });

    try {
      const res = await fetch("/api/kontakt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          navn: f.get("navn"),
          email: f.get("email"),
          virksomhed: f.get("virksomhed"),
          besked: f.get("besked"),
          _hp: f.get("_hp"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTilstand({
          slags: "fejl",
          besked: data.error ?? "Beskeden kunne ikke sendes. Prøv igen.",
        });
        return;
      }
      setTilstand({ slags: "sendt" });
    } catch {
      // Netværket svigtede. Det er ikke det samme som en afvisning, og
      // brugeren skal have en vej videre frem for en generisk fejl.
      setTilstand({
        slags: "fejl",
        besked:
          "Der var ingen forbindelse. Prøv igen, eller skriv til hej@alius.dk.",
      });
    }
  }

  if (tilstand.slags === "sendt") {
    return (
      <div
        className="border border-clay px-7 py-10 md:px-10 md:py-14"
        style={{ animation: "fadeUp 500ms ease-out both" }}
      >
        <p className="font-[300] text-[1.4rem] md:text-[1.7rem] text-ink leading-[1.4] mb-4">
          Tak. Beskeden er sendt.
        </p>
        <p className="font-[200] text-[0.95rem] text-slate leading-[1.8] max-w-[420px]">
          Vi vender tilbage hurtigst muligt, som regel samme dag. Skal det gå
          stærkere, så ring eller skriv direkte til hej@alius.dk.
        </p>
        <Link
          href="/"
          className="inline-block mt-8 font-[300] text-[0.78rem] tracking-[0.1em] uppercase text-slate hover:text-ink transition-colors no-underline"
        >
          &larr; Tilbage til forsiden
        </Link>
      </div>
    );
  }

  const sender = tilstand.slags === "sender";

  return (
    <form onSubmit={send} noValidate className="max-w-[560px]">
      {/* Skjult for mennesker. Udfyldt betyder robot. */}
      <div aria-hidden className="absolute w-px h-px overflow-hidden -left-[9999px]">
        <label htmlFor="_hp">Lad dette felt stå tomt</label>
        <input id="_hp" name="_hp" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Felt id="navn" etiket="Navn" paakraevet>
        <input
          id="navn"
          name="navn"
          type="text"
          required
          maxLength={120}
          autoComplete="name"
          className={inputKlasse}
        />
      </Felt>

      <Felt id="email" etiket="E-mail" paakraevet>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          inputMode="email"
          className={inputKlasse}
        />
      </Felt>

      <Felt id="virksomhed" etiket="Virksomhed">
        <input
          id="virksomhed"
          name="virksomhed"
          type="text"
          maxLength={120}
          autoComplete="organization"
          className={inputKlasse}
        />
      </Felt>

      <Felt id="besked" etiket="Hvad handler det om?" paakraevet>
        <textarea
          id="besked"
          name="besked"
          required
          rows={6}
          maxLength={5000}
          className={`${inputKlasse} resize-y min-h-[140px]`}
        />
      </Felt>

      {tilstand.slags === "fejl" && (
        <p
          role="alert"
          className="font-[300] text-[0.85rem] text-ink leading-[1.7] border-l-2 border-ink pl-4 mb-6"
        >
          {tilstand.besked}
        </p>
      )}

      <button
        type="submit"
        disabled={sender}
        className="font-[300] text-[0.82rem] tracking-[0.08em] uppercase px-9 py-4 bg-ink text-parchment border border-ink hover:bg-moss hover:border-moss transition-all disabled:opacity-45 disabled:cursor-wait"
      >
        {sender ? "Sender…" : "Send besked"}
      </button>

      <p className="font-[200] text-[0.75rem] text-stone leading-[1.7] mt-6">
        Vi bruger kun det du skriver til at svare dig. Ikke til nyhedsbreve,
        ikke til noget andet.
      </p>
    </form>
  );
}

const inputKlasse =
  "w-full bg-transparent border-b border-clay px-0 py-3 font-[300] text-[1rem] text-ink " +
  "placeholder:text-clay focus:border-moss focus:outline-none transition-colors";

function Felt({
  id,
  etiket,
  paakraevet,
  children,
}: {
  id: string;
  etiket: string;
  paakraevet?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <label
        htmlFor={id}
        className="block font-[300] text-[0.72rem] tracking-[0.12em] uppercase text-slate mb-1"
      >
        {etiket}
        {!paakraevet && (
          <span className="text-clay normal-case tracking-normal ml-2">
            valgfrit
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
