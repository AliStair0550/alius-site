export default function AliusLogo({
  width = 220,
  stroke = "#1A1A1A",
  dotFill = "#2D5F4A",
}: {
  width?: number;
  stroke?: string;
  dotFill?: string;
}) {
  const height = (width / 268) * 90;
  return (
    <svg viewBox="0 0 268 90" width={width} height={height}>
      <g
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 78 L27 11 L47 78" strokeWidth="2.8" />
        <path d="M16 50 L39 51" strokeWidth="1.8" />
        <path d="M68 12 L67 78 L98 77" strokeWidth="2.8" />
        <path d="M120 11 L119 78" strokeWidth="2.8" />
        <path
          d="M144 12 L144 58 Q145 76 163 77 Q181 76 182 58 L182 11"
          strokeWidth="2.8"
        />
        <path
          d="M236 22 Q237 11 222 11 Q208 12 208 24 Q208 36 222 42 Q236 48 236 60 Q236 76 222 77 Q208 76 208 65"
          strokeWidth="2.8"
        />
      </g>
      <circle cx="252" cy="73" r="5" fill={dotFill} />
    </svg>
  );
}
