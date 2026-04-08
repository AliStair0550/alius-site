@AGENTS.md

# ALIUS - alius.dk

## Brand
- Navn: Alius (latin: "den anden/anderledes")
- Tagline: Den anden vej til vækst
- Logo: Custom SVG wabi-sabi håndtegnet logotype + 10px moss cirkel på baseline til højre
- Logo komponent: src/components/AliusLogo.tsx

## Design
- Æstetik: Japansk minimalisme, wabi-sabi (skønhed i det ufuldkomne)
- Font: Jost - Thin (100) nav, ExtraLight (200) body, Light (300) headings
- Farver:
  - Ink: #1A1A1A (overskrifter, logo)
  - Moss: #2D5F4A (accent, CTAs, cirkel - ENESTE accentfarve)
  - Stone: #4A4A4A (brødtekst)
  - Slate: #6B7B75 (sekundær tekst)
  - Clay: #D4D0C8 (borders, dividers)
  - Fog: #E8E5DF (hover, sekundær bg)
  - Sand: #F5F3EF (sektionsbaggrunde)
  - Parchment: #FAF8F4 (primær baggrund)
- Ingen gradients, ingen skygger, ingen farver uden for paletten
- Brug aldrig lang bindestreg (-), kun almindelig (-)

## Principper
- Ma: Whitespace er aktivt designelement
- Wabi-sabi: Næsten-perfekt, menneskeligt
- Ichi: Ét budskab per sektion
- Katachi: Kvalitet i alt output

## Struktur
- Next.js 16 App Router, Tailwind v4, TypeScript
- Komponenter i src/components/
- Brand tokens defineret i src/app/globals.css

## Services
- Fundament: Brandidentitet, hjemmeside, positionering (fra 15.000 kr)
- Form: Prisstrategi, vækststrategi, forretningsudvikling (fra 45.000 kr)
- Forandring: Projektledelse, implementering, change management (fra 90.000 kr)

## Workflow
- Push til main, Vercel deployer automatisk
- git add . && git commit -m "beskrivelse" && git push
