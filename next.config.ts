import type { NextConfig } from "next";

const ONE_YEAR = 60 * 60 * 24 * 365;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  compress: true,
  // Allow LAN + common dev origins so phones on the same network can hit
  // the dev server. Next.js rejects bare "*" for safety — must use
  // multi-segment patterns. Only affects `next dev`; production ignores.
  allowedDevOrigins: [
    "192.168.*.*", // typical home/office LAN
    "10.*.*.*",    // 10.x.x.x LAN / VPN
    "172.16.*.*",  // 172.16-31 LAN
    "*.local",     // mDNS (e.g. my-mac.local)
    "*.ngrok.io",  // ngrok tunnels
    "*.ngrok-free.app",
    "*.trycloudflare.com",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: ONE_YEAR,
  },
  async headers() {
    return [
      {
        // Baseline security headers, all routes. No CSP for now — the inline
        // scroll-restoration <script> in layout.tsx would need a nonce/hash.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
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
        source: "/can/:path*",
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
