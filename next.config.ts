import type { NextConfig } from "next";

const ONE_YEAR = 60 * 60 * 24 * 365;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  compress: true,
  // Allow any dev-server origin (LAN testing on phones, etc.). Only affects
  // `next dev`; production builds ignore this.
  allowedDevOrigins: ["*"],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: ONE_YEAR,
  },
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: `public, max-age=${ONE_YEAR}, immutable`,
          },
        ],
      },
      {
        source: "/logos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: `public, max-age=${ONE_YEAR}, immutable`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
