import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tankeprofil · Alius";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#F9F7F2",
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(26,26,26,0.05) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          fontFamily: "serif",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 6,
            color: "#1A1A1A",
            fontWeight: 200,
          }}
        >
          ALIUS · TANKEPROFIL
        </div>

        <div
          style={{
            width: "100%",
            height: 1,
            background: "rgba(26,26,26,0.15)",
            marginTop: 20,
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            marginTop: 80,
            fontSize: 22,
            letterSpacing: 8,
            color: "#2D5F4A",
            fontWeight: 400,
          }}
        >
          SELVVURDERING
        </div>

        {/* Hero text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 32,
          }}
        >
          <div
            style={{
              fontSize: 128,
              lineHeight: 0.95,
              letterSpacing: -3,
              color: "#1A1A1A",
              fontStyle: "italic",
              fontWeight: 300,
              display: "flex",
            }}
          >
            Lær din
          </div>
          <div
            style={{
              fontSize: 128,
              lineHeight: 0.95,
              letterSpacing: -3,
              color: "#2D5F4A",
              fontStyle: "italic",
              fontWeight: 300,
              display: "flex",
            }}
          >
            tænkning at kende.
          </div>
        </div>

        {/* Glyph in corner */}
        <div
          style={{
            position: "absolute",
            top: 200,
            right: 100,
            display: "flex",
          }}
        >
          <svg width="220" height="220" viewBox="0 0 220 220">
            <g style={{ mixBlendMode: "multiply" }}>
              <circle cx="92" cy="92" r="68" fill="#2D5F4A" opacity="0.85" />
              <circle cx="128" cy="92" r="62" fill="#5B7C9D" opacity="0.85" />
              <circle cx="128" cy="128" r="58" fill="#C8956D" opacity="0.85" />
              <circle cx="92" cy="128" r="64" fill="#8B7355" opacity="0.85" />
            </g>
          </svg>
        </div>

        {/* Bottom */}
        <div style={{ flex: 1, display: "flex" }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            color: "#1A1A1A",
            opacity: 0.6,
            letterSpacing: 4,
          }}
        >
          <div style={{ display: "flex" }}>
            FIRE MÅDER · TRE KORT · ÉN PROFIL
          </div>
          <div style={{ display: "flex" }}>ALIUS.DK/TANKEPROFIL</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
