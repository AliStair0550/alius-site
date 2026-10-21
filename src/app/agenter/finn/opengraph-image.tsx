import { ImageResponse } from "next/og";

// Delingsbilledet for Finn Finans: hans avatar stort, navnet og hvad han
// gør. Statisk med vilje: bygges én gang og caches, og et delt link ser
// ens ud uanset hvornår det deles. Ingen gradienter, ingen skygger.

export const alt = "Finn Finans, Alius' agent for dansk økonomi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1A1A1A";
const MOSS = "#2D5F4A";
const SAND = "#F5F3EF";
const PARCH = "#FAF8F4";
const FOG = "#E8E5DF";
const STONE = "#4A4A4A";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: SAND, display: "flex", padding: 48, fontFamily: "sans-serif" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            background: PARCH,
            border: `1px solid ${FOG}`,
            borderRadius: 40,
            padding: "56px 64px",
            alignItems: "center",
            gap: 56,
          }}
        >
          <svg width="340" height="340" viewBox="0 0 120 120">
            <path d="M22 112 C 26 86, 42 76, 60 76 C 79 76, 94 85, 99 112" fill={SAND} stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
            <path
              d="M60 22 C 72 22, 79 31, 78.5 43 C 78 56, 70 64, 60 64 C 49 64, 41.5 55.5, 41.5 43.5 C 41.5 31, 48.5 22, 60 22 Z"
              fill={PARCH}
              stroke={INK}
              strokeWidth="1.4"
            />
            <path d="M52 45 q 2.5 1.6 5 0" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M64 45 q 2.5 1.6 5 0" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
            <g transform="rotate(-6 60 94)">
              <rect x="38" y="80" width="44" height="30" rx="1.5" fill={PARCH} stroke={INK} strokeWidth="1.2" />
              <path d="M43 102 L 51 96 L 57 99 L 65 89 L 71 93 L 77 86" fill="none" stroke={MOSS} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="77" cy="86" r="2.2" fill={MOSS} />
            </g>
          </svg>

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, letterSpacing: 6, color: MOSS }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: MOSS, display: "flex" }} />
              ALIUS AGENTER
            </div>
            <div style={{ fontSize: 92, color: INK, fontWeight: 300, letterSpacing: -2, lineHeight: 1.05, marginTop: 22 }}>Finn Finans</div>
            <div style={{ fontSize: 34, color: STONE, lineHeight: 1.35, marginTop: 22, maxWidth: 560 }}>
              Dansk økonomi hver morgen kl. 6. Hvert tal med kilde.
            </div>
            <div style={{ display: "flex", marginTop: 36 }}>
              <div style={{ display: "flex", borderRadius: 999, background: MOSS, color: PARCH, fontSize: 24, padding: "12px 26px" }}>
                alius.dk/agenter/finn
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
