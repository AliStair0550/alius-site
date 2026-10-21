// Agenternes avatarer. Tegnet i streg i Alius' palette, lidt skæve med
// vilje (wabi-sabi): et menneske der læser, ikke et ikon.

type Props = { size?: number; className?: string };

/** Finn: en rolig figur med et ark, hvor en kurve går op og ned. */
export function FinnAvatar({ size = 120, className }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Finn Finans"
    >
      {/* Skulderlinjen, en blød bue der ikke er helt symmetrisk */}
      <path className="fill-sand stroke-ink"
        d="M22 112 C 26 86, 42 76, 60 76 C 79 76, 94 85, 99 112"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Hovedet */}
      <path className="fill-parchment stroke-ink"
        d="M60 22 C 72 22, 79 31, 78.5 43 C 78 56, 70 64, 60 64 C 49 64, 41.5 55.5, 41.5 43.5 C 41.5 31, 48.5 22, 60 22 Z"
        strokeWidth="1.4"
      />
      {/* Øjne, sænket mod arket */}
      <path className="stroke-ink" d="M52 45 q 2.5 1.6 5 0" fill="none"  strokeWidth="1.2" strokeLinecap="round" />
      <path className="stroke-ink" d="M64 45 q 2.5 1.6 5 0" fill="none"  strokeWidth="1.2" strokeLinecap="round" />
      {/* Arket han læser, let skråt */}
      <g transform="rotate(-6 60 94)">
        <rect className="fill-parchment stroke-ink" x="38" y="80" width="44" height="30" rx="1.5"   strokeWidth="1.2" />
        <path className="stroke-moss"
          d="M43 102 L 51 96 L 57 99 L 65 89 L 71 93 L 77 86"
          fill="none"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className="fill-moss" cx="77" cy="86" r="2.2"  />
      </g>
    </svg>
  );
}

/** En ledig plads: samme kontur, stiplet og uden ansigt. */
export function Silhuet({ size = 120, className }: Props) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
      <path className="stroke-clay"
        d="M22 112 C 26 86, 42 76, 60 76 C 79 76, 94 85, 99 112"
        fill="none"
        strokeWidth="1.4"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
      <path className="stroke-clay"
        d="M60 22 C 72 22, 79 31, 78.5 43 C 78 56, 70 64, 60 64 C 49 64, 41.5 55.5, 41.5 43.5 C 41.5 31, 48.5 22, 60 22 Z"
        fill="none"
        strokeWidth="1.4"
        strokeDasharray="3 4"
      />
    </svg>
  );
}

export function AgentAvatar({ noegle, size }: { noegle: string; size?: number }) {
  // Kun Finn findes endnu. En ukendt nøgle tegnes som en ledig plads
  // frem for at låne Finns ansigt.
  return noegle === "finn" ? <FinnAvatar size={size} /> : <Silhuet size={size} />;
}
