import { ImageResponse } from "next/og";

import { siteConfig, socialImageAlt } from "@/lib/config";

export const dynamic = "force-static";
export const alt = socialImageAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const colors = {
  canvas: "#e8ebe6",
  card: "#ffffff",
  ink: "#0e0f0c",
  body: "#454745",
  primary: "#9fe870",
  onPrimary: "#163300",
};

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "48px 64px",
        background: colors.canvas,
        color: colors.ink,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <svg aria-hidden="true" width="80" height="80" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="15" fill={colors.primary} />
          <path
            d="M11 32V16h10M11 23h8M25 32V17l6 7 6-7v15"
            stroke={colors.onPrimary}
            strokeWidth="3.5"
            strokeLinecap="square"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -2.5 }}>free models.</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 126,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: -7,
            }}
          >
            <div>
              {`${siteConfig.headline.first} ${siteConfig.headline.second}${siteConfig.headline.punctuation}`}
            </div>
            <div style={{ color: colors.body, fontSize: 100, letterSpacing: -5, marginTop: 24 }}>
              {siteConfig.tagline}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            width: 330,
            height: 330,
            padding: 28,
            borderRadius: 24,
            background: colors.card,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 180, fontWeight: 900, lineHeight: 1, letterSpacing: -10 }}>
              {siteConfig.socialPrice}
            </span>
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
