import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "Free Models — Compare free AI models, API providers, limits, and benchmarks";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 72,
        background: "#0e0f0c",
        color: "#e8ebe6",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 76,
            height: 76,
            borderRadius: 24,
            background: "#9fe870",
            color: "#163300",
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          FM
        </div>
        <div style={{ fontSize: 34 }}>Free Models</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 700 }}>
        <div>Big ideas.</div>
        <div style={{ color: "#9fe870" }}>Free AI models.</div>
      </div>
      <div style={{ fontSize: 28 }}>Compare API providers, usage limits, and benchmarks.</div>
    </div>,
    size,
  );
}
