import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Beyond Opus · Elevate — For moments that matter.",
  description:
    "Caffeine to climb. Nootropics to think. Adaptogens to land — no crash. Coming Q3 2026.",
  metadataBase: new URL("https://beyondopus.com"),
  openGraph: {
    title: "Beyond Opus · Elevate",
    description:
      "Caffeine to climb. Nootropics to think. Adaptogens to land — no crash. Coming Q3 2026.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0c0c0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable}`}>
      <head>
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
      </head>
      <body>{children}</body>
    </html>
  );
}
