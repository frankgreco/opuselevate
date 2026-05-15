"use client";

import Image from "next/image";
import { type CSSProperties, useEffect, useRef, useState } from "react";

type Logo = {
  src: string;
  alt: string;
  w: number;
  intrinsicH: number;
  h: number;
  invert?: boolean;
};

const LOGOS: readonly Logo[] = [
  { src: "/logos/nasa.png", alt: "NASA", w: 479, intrinsicH: 133, h: 30, invert: true },
  { src: "/logos/ted.png", alt: "TED", w: 1280, intrinsicH: 470, h: 36, invert: true },
  { src: "/logos/olympics.svg", alt: "Olympics", w: 1020, intrinsicH: 495, h: 32 },
  { src: "/logos/ferrari.webp", alt: "Ferrari", w: 800, intrinsicH: 800, h: 48 },
  { src: "/logos/fide.png", alt: "FIDE", w: 300, intrinsicH: 249, h: 48 },
  { src: "/logos/harvard.png", alt: "Harvard", w: 202, intrinsicH: 249, h: 52, invert: true },
];

const GAP = 56;
// Seconds for one logo-set width to scroll past — preserves the original perceived speed.
const SECONDS_PER_SET = 28;

const halfStyle: CSSProperties = {
  display: "flex",
  gap: GAP,
  paddingRight: GAP,
  flexShrink: 0,
  alignItems: "center",
  whiteSpace: "nowrap",
};

function LogoSet({ keyPrefix }: { keyPrefix: string }) {
  return (
    <>
      {LOGOS.map((logo) => (
        <Image
          key={`${keyPrefix}-${logo.src}`}
          src={logo.src}
          alt={logo.alt}
          width={logo.w}
          height={logo.intrinsicH}
          style={{
            height: logo.h,
            width: "auto",
            display: "block",
            objectFit: "contain",
            opacity: 0.7,
            filter: logo.invert ? "invert(1)" : undefined,
          }}
        />
      ))}
    </>
  );
}

export function LogoMarquee() {
  const containerRef = useRef<HTMLElement>(null);
  const unitRef = useRef<HTMLDivElement>(null);
  const [repeats, setRepeats] = useState(1);

  useEffect(() => {
    const compute = () => {
      const unitWidth = unitRef.current?.offsetWidth ?? 0;
      const viewportWidth =
        containerRef.current?.offsetWidth ?? window.innerWidth;
      if (unitWidth === 0) return;
      const needed = Math.max(1, Math.ceil(viewportWidth / unitWidth) + 1);
      setRepeats((prev) => (prev === needed ? prev : needed));
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <section
      ref={containerRef}
      style={{
        position: "relative",
        borderTop: ".5px solid var(--hair)",
        borderBottom: ".5px solid var(--hair)",
        padding: "20px 0",
        overflow: "hidden",
      }}
    >
      <div
        ref={unitRef}
        aria-hidden
        style={{
          ...halfStyle,
          position: "absolute",
          top: 0,
          left: 0,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <LogoSet keyPrefix="measure" />
      </div>

      <div
        className="km-marquee"
        style={{ animationDuration: `${repeats * SECONDS_PER_SET}s` }}
      >
        {[0, 1].map((half) => (
          <div key={half} style={halfStyle}>
            {Array.from({ length: repeats }, (_, r) => (
              <LogoSet key={`${half}-${r}`} keyPrefix={`${half}-${r}`} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
