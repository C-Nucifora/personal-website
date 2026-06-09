import { ImageResponse } from "next/og";
import { profile } from "@/data/profile";

export const dynamic = "force-static";

export const alt = `${profile.name} — developer portfolio`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const strip = (s: string) => s.replace(/^TODO\s*/, "");

// Tokyo Night palette, baked in (the OG card is theme-independent).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#16161e",
          padding: 80,
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: "#1a1b26",
            border: "1px solid #292e42",
            borderRadius: 20,
            padding: 56,
          }}
        >
          <div style={{ display: "flex", gap: 10, marginBottom: 36 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#f7768e" }} />
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#e0af68" }} />
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#9ece6a" }} />
          </div>

          <div style={{ display: "flex", fontSize: 30, color: "#565f89", marginBottom: 20 }}>
            <span style={{ color: "#9ece6a" }}>visitor</span>
            <span>@</span>
            <span style={{ color: "#bb9af7" }}>{profile.username}</span>
            <span>:</span>
            <span style={{ color: "#7aa2f7" }}>~</span>
            <span style={{ color: "#7aa2f7" }}>$</span>
            <span style={{ color: "#c0caf5", marginLeft: 14 }}>whoami</span>
          </div>

          <div style={{ fontSize: 76, fontWeight: 700, color: "#c0caf5", lineHeight: 1.1 }}>
            {profile.name}
          </div>
          <div style={{ fontSize: 40, color: "#7aa2f7", marginTop: 16 }}>{strip(profile.role)}</div>

          <div style={{ fontSize: 28, color: "#565f89", marginTop: 40 }}>
            {profile.siteUrl.replace(/^https?:\/\//, "")}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
