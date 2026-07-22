import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ALIUS - Vi bygger digitale maskiner";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FAF8F4",
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(26,26,26,0.04) 1px, transparent 0)",
          backgroundSize: "26px 26px",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Dekorative moss-cirkler top-højre */}
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -90,
            width: 440,
            height: 440,
            borderRadius: "50%",
            background: "#2D5F4A",
            opacity: 0.05,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 46,
            right: 130,
            width: 250,
            height: 250,
            borderRadius: "50%",
            border: "1px solid rgba(45,95,74,0.16)",
            display: "flex",
          }}
        />

        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 26,
            letterSpacing: 10,
            color: "#1A1A1A",
            fontWeight: 300,
          }}
        >
          ALIUS
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#2D5F4A",
              marginLeft: 12,
              display: "flex",
            }}
          />
        </div>
        <div
          style={{
            width: "100%",
            height: 1,
            background: "rgba(26,26,26,0.12)",
            marginTop: 22,
            display: "flex",
          }}
        />

        {/* Overskrift */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 118,
          }}
        >
          <div
            style={{
              fontSize: 100,
              lineHeight: 1.04,
              letterSpacing: -2,
              color: "#1A1A1A",
              fontWeight: 300,
              display: "flex",
            }}
          >
            Vi bygger
          </div>
          <div
            style={{
              fontSize: 100,
              lineHeight: 1.04,
              letterSpacing: -2,
              color: "#2D5F4A",
              fontWeight: 400,
              display: "flex",
            }}
          >
            digitale maskiner.
          </div>
        </div>

        <div style={{ flex: 1, display: "flex" }} />

        {/* Bund */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 24,
            color: "#1A1A1A",
            opacity: 0.55,
            letterSpacing: 2,
          }}
        >
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#2D5F4A",
              marginRight: 14,
              display: "flex",
            }}
          />
          alius.dk
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
