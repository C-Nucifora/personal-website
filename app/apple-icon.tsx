import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Tokyo Night, like the OG card. Solid square — iOS applies its own mask.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1b26",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700 }}>
          <span style={{ color: "#7aa2f7" }}>&gt;</span>
          <span style={{ color: "#c0caf5" }}>_</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
