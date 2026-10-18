import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { inlineCss: true },
  async headers() {
    return [
      {
        source: "/brand-logos/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
