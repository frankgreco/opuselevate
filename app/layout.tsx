import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

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
        <link rel="preload" href="/can/angle-topdown.png" as="image" />
        <link rel="preload" href="/can/angle-front.png" as="image" />
        <link rel="preload" href="/can/angle-tilt22.png" as="image" />
        <link rel="preload" href="/can/angle-tilt10.png" as="image" />
      </head>
      <body>{children}</body>
    </html>
  );
}
