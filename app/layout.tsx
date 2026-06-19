import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { CAN_FRAMES } from "./can-frames";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const DESCRIPTION =
  "A three-phase nootropic performance drink engineered for sustained focus and energy without a crash. For moments that matter. Launching Q3 2026 — join the waitlist.";

export const metadata: Metadata = {
  title: "Opus Elevate",
  description: DESCRIPTION,
  metadataBase: new URL("https://drinkopuselevate.com"),
  openGraph: {
    title: "Opus Elevate",
    description: DESCRIPTION,
    type: "website",
    siteName: "Opus Elevate",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  // Extend the page background through the iOS safe area (e.g., below
  // the home indicator) instead of letting Safari letterbox it.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable}`}>
      <head>
        {/* Disable the browser's scroll restoration before hydration. On a
            reload the browser restores the previous scrollY around hydration
            time; if it lands mid-pin, ScrollTrigger initializes at that
            progress and applies the scroll timeline (front-pose can + a beat)
            while the entry timeline is still fading the logo in — a flash of
            three mutually-exclusive states at once. A raw inline <script> here
            runs synchronously during head parse — before the browser restores
            scroll — and wins the race. (next/script beforeInteractive only
            serializes the snippet into the RSC payload, too late to help.) The
            in-effect reset in Elevate then only handles same-document nav. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('scrollRestoration' in history){history.scrollRestoration='manual';}window.scrollTo(0,0);",
          }}
        />
        <link
          rel="preload"
          href="/fonts/HelveticaNeueLTPro-HvCn.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/HelveticaNeueLTPro-BdCn.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        {/* Only the rest-pose frame is preloaded for a fast first paint; the
            remaining rotation frames are loaded as off-DOM Image objects by
            Elevate and painted to a canvas on scroll. Preloading all 100 here
            forced the browser to fetch + decode every frame up front, spiking
            memory on load (and crashing iOS Safari). */}
        <link rel="preload" href={CAN_FRAMES[0]} as="image" type="image/avif" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
