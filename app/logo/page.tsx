"use client";

// Throwaway page for the opus·elevate 3D-glass wordmark. Just the one look:
// the swoosh extruded into real geometry with physical transmission/dispersion
// (see GlassMeshPanel), "Elevate" flat white below. Delete this folder when done.

import { useEffect, useRef, useState } from "react";
import { GlassMeshPanel } from "./GlassMeshPanel";
import { buildElevateDataUrl } from "./buildSdf";

export default function LogoPage() {
  const [elevateUrl, setElevateUrl] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (el) {
      const ro = new ResizeObserver(() => setHeight(el.clientHeight));
      ro.observe(el);
      buildElevateDataUrl()
        .then(setElevateUrl)
        .catch((e) => console.warn("[elevate overlay] failed:", e));
      return () => ro.disconnect();
    }
  }, []);

  return (
    <main style={{ minHeight: "100dvh", background: "#0a0a0a", display: "grid", placeItems: "center" }}>
      {/* Capped by both viewport height and width so the wide mark never clips. */}
      <div ref={boxRef} style={{ width: "100%", height: "min(72vh, 40vw)" }}>
        {height > 0 && <GlassMeshPanel elevateUrl={elevateUrl} height={height} />}
      </div>
    </main>
  );
}
