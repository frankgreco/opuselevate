"use client";

import { useEffect, useRef } from "react";

// Parallax starfield rendered to ONE <canvas> (never N DOM nodes — stacked
// layers crashed iOS Safari for the can frames; same lesson applies here).
// Sits fixed behind all content; stars drift on scroll, pointer, and device
// tilt (gyro) with per-layer depth, slowly drift upward, and twinkle. Honours
// prefers-reduced-motion (no autonomous motion).
//
// Depth layers: nearer layers (higher `p`) are bigger, brighter, and parallax
// further. Counts scale with viewport area so density is resolution-stable.
const LAYERS = [
  { p: 0.18, density: 7.0e-5, size: [0.5, 1.0] as const, alpha: 0.35 },
  { p: 0.42, density: 4.5e-5, size: [0.7, 1.4] as const, alpha: 0.6 },
  { p: 0.85, density: 1.8e-5, size: [1.0, 1.9] as const, alpha: 0.95 },
];

// Tuned look (baked from the dev panel).
const CFG = {
  color: "#dfe7ff", // star tint (cool white, matches the can backlight)
  densityMul: 1.15, // ×base star count
  sizeMul: 1.15, // ×star radius
  brightness: 1.15, // ×star alpha
  scrollParallax: 0.06, // px drift per px scrolled, ×layer depth
  pointerParallax: 37, // px drift at full pointer/tilt deflection, ×layer depth
  twinkleAmt: 0.76, // 0 = steady, 1 = full flicker
  twinkleSpeed: 1, // ×twinkle rate
  driftSpeed: 5, // px/s autonomous upward drift, ×layer depth
  vignette: 0.54, // edge-darkening strength
};

type Star = {
  x: number;
  y: number;
  r: number;
  a: number;
  twSpeed: number;
  twPhase: number;
  layer: number;
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let w = 0;
    let h = 0;
    let stars: Star[] = [];

    const build = () => {
      stars = [];
      for (let li = 0; li < LAYERS.length; li++) {
        const L = LAYERS[li];
        const count = Math.round(w * h * L.density * CFG.densityMul);
        for (let i = 0; i < count; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: L.size[0] + Math.random() * (L.size[1] - L.size[0]),
            a: L.alpha * (0.5 + Math.random() * 0.5),
            twSpeed: 0.4 + Math.random() * 1.4,
            twPhase: Math.random() * Math.PI * 2,
            layer: li,
          });
        }
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const [cr, cg, cb] = hexToRgb(CFG.color);

    let pxT = 0;
    let pyT = 0;
    let px = 0;
    let py = 0;
    const onPointer = (e: PointerEvent) => {
      pxT = e.clientX / w - 0.5;
      pyT = e.clientY / h - 0.5;
    };

    const paint = (time: number) => {
      const ts = time * 0.001;
      ctx.clearRect(0, 0, w, h);
      px += (pxT - px) * 0.05;
      py += (pyT - py) * 0.05;
      const pPar = reduce ? 0 : CFG.pointerParallax;
      const drift = reduce ? 0 : CFG.driftSpeed;
      const scroll = window.scrollY || window.pageYOffset || 0;
      ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
      for (const s of stars) {
        const lp = LAYERS[s.layer].p;
        const ox = -px * pPar * lp;
        const oy =
          -py * pPar * lp - scroll * CFG.scrollParallax * lp - ts * drift * lp;
        let xx = (s.x + ox) % w;
        if (xx < 0) xx += w;
        let yy = (s.y + oy) % h;
        if (yy < 0) yy += h;
        const tw = reduce
          ? 1
          : 1 -
            CFG.twinkleAmt +
            CFG.twinkleAmt *
              (0.5 + 0.5 * Math.sin(ts * s.twSpeed * CFG.twinkleSpeed + s.twPhase));
        ctx.globalAlpha = s.a * CFG.brightness * tw;
        ctx.beginPath();
        ctx.arc(xx, yy, s.r * CFG.sizeMul, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduce) {
      paint(0);
      const onScroll = () => paint(0);
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", onScroll);
      };
    }

    window.addEventListener("pointermove", onPointer, { passive: true });

    // Device-orientation (gyro) parallax — phones have no pointermove, so tilt
    // drives the same px/py pipeline as the mouse. The first reading becomes the
    // neutral pose, so "however you're holding it" reads as centre. iOS 13+ needs
    // an explicit permission grant from a user gesture (requested on first tap),
    // and a secure context (https or localhost) or the events never fire.
    let baseBeta: number | null = null;
    let baseGamma: number | null = null;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      if (baseBeta == null) {
        baseBeta = e.beta;
        baseGamma = e.gamma;
      }
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      pxT = clamp((e.gamma - baseGamma!) / 30) * 0.5;
      pyT = clamp((e.beta - baseBeta!) / 30) * 0.5;
    };
    const DOE = window.DeviceOrientationEvent as unknown as
      | { requestPermission?: () => Promise<"granted" | "denied"> }
      | undefined;
    const attachOrient = () =>
      window.addEventListener("deviceorientation", onOrient);
    let onFirstTap: (() => void) | null = null;
    if (DOE && typeof DOE.requestPermission === "function") {
      // iOS — must be called synchronously inside a user gesture.
      onFirstTap = () => {
        DOE.requestPermission?.()
          .then((res) => {
            if (res === "granted") attachOrient();
          })
          .catch(() => {});
        if (onFirstTap) {
          window.removeEventListener("touchend", onFirstTap);
          window.removeEventListener("click", onFirstTap);
        }
      };
      window.addEventListener("touchend", onFirstTap, { passive: true });
      window.addEventListener("click", onFirstTap);
    } else if (DOE) {
      // Android / older iOS — no permission gate.
      attachOrient();
    }

    let raf = 0;
    const loop = (t: number) => {
      paint(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onOrient);
      if (onFirstTap) {
        window.removeEventListener("touchend", onFirstTap);
        window.removeEventListener("click", onFirstTap);
      }
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      {/* Vignette — deepens the edges so the field reads as a void, like the
          reference. Above the stars, below all content. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: `radial-gradient(120% 120% at 50% 42%, transparent 55%, rgba(0,0,0,${CFG.vignette}) 100%)`,
        }}
      />
    </>
  );
}
