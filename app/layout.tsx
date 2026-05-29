import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { CAN_FRAMES } from "./can-frames";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Opus Elevate",
  description: "",
  metadataBase: new URL("https://drinkopuselevate.com"),
  openGraph: {
    title: "Opus Elevate",
    description: "",
    type: "website",
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
        {CAN_FRAMES.map((src) => (
          <link
            key={src}
            rel="preload"
            href={src}
            as="image"
            type="image/avif"
          />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
