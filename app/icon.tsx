import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Large PNG icon for the web manifest (favicon.ico stays the tab icon).
export default function Icon() {
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
          borderRadius: 96,
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", fontSize: 250, fontWeight: 700 }}>
          <span style={{ color: "#7aa2f7" }}>&gt;</span>
          <span style={{ color: "#c0caf5" }}>_</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
