"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Waitlist, type WaitlistState } from "./Waitlist";
import { CAN_FRAMES } from "../can-frames";
import { GlassMeshPanel } from "../logo/GlassMeshPanel";
import { buildElevateDataUrl } from "../logo/buildSdf";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STACK = [
  {
    tag: "01",
    name: "Energy",
    range: "0–20 MIN",
    ings: [
      ["Caffeine", "120"],
      ["Taurine", "750"],
      ["ALCAR", "500"],
    ],
    hue: "#d97a4a",
  },
  {
    tag: "02",
    name: "Drive",
    range: "30–120 MIN",
    ings: [
      ["L-Tyrosine", "500"],
      ["Rhodiola", "300"],
    ],
    hue: "#a8843e",
  },
  {
    tag: "03",
    name: "Flow",
    range: "60–240 MIN",
    ings: [
      ["L-Theanine", "200"],
      ["Alpha-GPC", "300"],
    ],
    hue: "#5a8a9e",
  },
] as const;

const CN: CSSProperties = { fontFamily: "var(--font-cn)" };
const MONO: CSSProperties = { fontFamily: "var(--font-mono)" };

// "#rrggbb" → "r, g, b" for building rgba() gradient stops.
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

// TEMPORARY (dev tuning): one labelled slider for the backlight panel.
function Dial({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
}) {
  return (
    <label
      style={{
        ...MONO,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        fontSize: 9,
        letterSpacing: ".06em",
        color: "rgba(255,255,255,0.6)",
        width: 92,
      }}
    >
      <span style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
        <span>{label}</span>
        <span style={{ color: "#fff" }}>{fmt ? fmt(value) : String(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#cdd9ff" }}
      />
    </label>
  );
}

// Plain vh — GSAP can't tween CSS min()/calc(). On narrow screens
// can may exceed viewport width; main has overflow:hidden so it clips.
// Hero rest (topdown): top 41% of can peeking at viewport bottom.
// Rest pose: the can peeks from the bottom showing the lid + shoulder, but
// sits low enough that the "opus" wordmark on the body stays below the fold
// at rest — it's only revealed as the can rises on scroll.
const HERO_BOTTOM = "-54vh";
const HERO_HEIGHT = "110vh";
// Top-anchored (front view): large front can dominating the upper portion
// of the viewport, leaving room for beat content below.
const PIN_BOTTOM = "32vh";
const PIN_HEIGHT = "68vh";


// TEMPORARY (stakeholder review): the 3D-glass wordmark from /logo, sized to sit
// in the hero in place of the flat SVG. Measures its own box and feeds the px
// height to GlassMeshPanel (which sizes the extruded mesh to height*0.8). The box
// is sized so the mesh width roughly matches the flat logo's footprint. Remove
// this — and the toggle in Elevate — once a direction is chosen.
function HeroGlassLogo() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [elevateUrl, setElevateUrl] = useState<string | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    buildElevateDataUrl()
      .then(setElevateUrl)
      .catch((e) => console.warn("[hero glass logo] failed:", e));
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} style={{ width: "min(560px, 92vw)", height: "min(220px, 34vw)" }}>
      {height > 0 && <GlassMeshPanel elevateUrl={elevateUrl} height={height} />}
    </div>
  );
}

export function Elevate() {
  const [waitlist, setWaitlist] = useState<WaitlistState>({
    submitted: false,
    position: null,
  });
  // TEMPORARY: stakeholder toggle between the flat SVG logo and the 3D-glass one.
  const [glassLogo, setGlassLogo] = useState(false);
  // TEMPORARY (dev tuning): live controls for the can backlight halo, driven by
  // the panel at the top of the screen. Once dialed in, bake these values into
  // the backlight style + pulse and delete the panel, this state, and the
  // pulse effect below.
  const [bl, setBl] = useState({
    color: "#e0e9ff",
    intensity: 1, // multiplies the gradient alphas
    size: 0.45, // 0..1 → how far the halo spreads past the can box
    blur: 26, // px
    posY: 47, // % vertical centre of the glow behind the can
    spread: 74, // % outer (transparent) stop
    pulseOn: true,
    pulseAmt: 1.08, // breathing scale
    pulseSpeed: 4.5, // s per half-cycle
  });

  const root = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const canStageRef = useRef<HTMLDivElement>(null);
  // The can rotation is CAN_FRAMES.length frames sliced from the source clip,
  // ordered top-down rest pose (index 0) → straight-on front (last). They are
  // loaded as off-DOM Image objects and painted, one at a time, to a single
  // <canvas> as scroll progresses. (Mounting all frames as stacked <img>
  // layers — one GPU compositor layer each — blew past iOS Safari's per-tab
  // memory ceiling and crashed the page on load.)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backlightRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const beatRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]);
  const bloomRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]);
  const waitlistRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Dev: expose gsap on window so the browser-driven testing harness can drive
      // the intro timeline manually (rAF is throttled in headless/hidden tabs).
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        (window as unknown as { gsap: unknown }).gsap = gsap;
      }
      // Disable browser scroll restoration. Without this, a Cmd+R / F5
      // refresh would restore the previous scrollY and the ScrollTrigger
      // timeline would be mid-progress on first paint, causing a layout
      // shift vs. a fresh navigation. Force scrollY 0 on every load.
      if (typeof window !== "undefined") {
        if ("scrollRestoration" in window.history) {
          window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);
      }

      // 0) Load the rotation frames as off-DOM Image objects. Only the frame
      // currently being shown is ever painted to the canvas, so decoded-image
      // memory is bounded by the browser's own cache rather than 100 live
      // compositor layers. Compressed source bytes (~6 MB total) are trivial.
      const images = CAN_FRAMES.map((src) => {
        const img = new Image();
        img.decoding = "async";
        img.src = src;
        return img;
      });
      imagesRef.current = images;

      const isReady = (im?: HTMLImageElement) =>
        !!im && im.complete && im.naturalWidth > 0;

      let bufferSized = false;
      let lastDrawn = -1;
      const drawFrame = (idx: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const n = images.length;
        let i = Math.min(n - 1, Math.max(0, Math.round(idx)));
        let img = images[i];
        // Fast scroll can outrun decode; fall back to the nearest decoded
        // frame so the canvas never flashes blank.
        if (!isReady(img)) {
          for (let d = 1; d < n; d++) {
            if (isReady(images[i - d])) { img = images[i - d]; i -= d; break; }
            if (isReady(images[i + d])) { img = images[i + d]; i += d; break; }
          }
        }
        if (!isReady(img)) return;
        if (!bufferSized) {
          // Backing store = source resolution; the element is scaled to the
          // stage box via CSS object-fit (matching the old <img> contain).
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          bufferSized = true;
        }
        if (i === lastDrawn) return;
        // Frames carry alpha (transparent background), so clear before each
        // paint to avoid the previous frame ghosting through.
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        lastDrawn = i;
      };

      // Paint the rest-pose frame as soon as it decodes (entry fades it in).
      if (isReady(images[0])) drawFrame(0);
      else images[0].addEventListener("load", () => drawFrame(0), { once: true });

      // 1) Set initial state: hero rest pose immediately. The rest-pose frame
      // (index 0) peeks from the bottom edge, logo centered, everything else
      // hidden. The canvas starts hidden; the entry timeline fades it in.
      gsap.set(canvasRef.current, { autoAlpha: 0 });
      gsap.set(backlightRef.current, { autoAlpha: 0 });
      gsap.set(logoRef.current, { autoAlpha: 0, y: 12 });
      gsap.set(canStageRef.current, {
        bottom: HERO_BOTTOM,
        height: HERO_HEIGHT,
        autoAlpha: 1,
      });
      // (Note: the inline-style block above already sets the same values;
      // this gsap.set is here so GSAP's internal cache is in sync.)
      gsap.set(beatRefs.current, {
        autoAlpha: 0,
        y: 40,
        filter: "blur(8px)",
      });
      gsap.set(bloomRefs.current, { autoAlpha: 0 });
      gsap.set(waitlistRef.current, { autoAlpha: 0, y: 40 });

      // 2) Build the scroll timeline (deferred — attached after intro completes).
      const buildScrollTl = () => {
        const tl = gsap.timeline({
          defaults: { ease: "power1.inOut" },
          scrollTrigger: {
            trigger: stageRef.current,
            start: "top top",
            end: "+=600%",
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });

        // [0 → 0.08] Logo fades out. Anchored at progress 0 (no dead zone)
        // so the fully-scrolled-up state IS the tween's FROM state
        // (autoAlpha: 1) — i.e. scrolling all the way back up always
        // restores the logo to the initial state. fromTo with explicit
        // FROM + immediateRender:false so the entry fade-in isn't snapped
        // over at scroll TL creation.
        tl.fromTo(
          logoRef.current,
          { autoAlpha: 1, y: 0 },
          { autoAlpha: 0, duration: 0.08, immediateRender: false },
          0,
        );

        // [0.08 → 0.30] Rise: can lifts + grows. 4-frame angle morph:
        // topdown → tilt22 → tilt10 → front (each crossfade between
        // adjacent ~10° angle deltas, smooth perspective shift).
        // FromTo with explicit FROM locks in the responsive HERO pose
        // per breakpoint (set by gsap.matchMedia).
        tl.fromTo(
          canStageRef.current,
          { bottom: HERO_BOTTOM, height: HERO_HEIGHT },
          {
            bottom: PIN_BOTTOM,
            height: PIN_HEIGHT,
            duration: 0.22,
            ease: "power2.inOut",
            immediateRender: false,
          },
          0.08,
        );
        // Angle morph across the rise window: drive a single frame index from
        // first → last and paint it to the canvas. With ~100 frames each step
        // is a tiny camera-tilt delta, so the scrubbed swap reads as a smooth
        // perspective shift (video-like) rather than discrete jumps.
        const frameState = { i: 0 };
        tl.to(
          frameState,
          {
            i: images.length - 1,
            duration: 0.18, // xfade window 0.12 → 0.30
            ease: "none",
            immediateRender: false,
            onUpdate: () => drawFrame(frameState.i),
          },
          0.12,
        );

        // [0.34 → 0.94] Three beats, edge-to-edge (no overlap). Each beat's
        // OUT completes exactly when the next beat's IN starts, so the
        // previous beat is fully gone before the next one fades in.
        const beatStarts = [0.34, 0.54, 0.74];
        const beatHold = 0.10;
        const beatFade = 0.05;
        beatStarts.forEach((start, i) => {
          const beat = beatRefs.current[i];
          const bloom = bloomRefs.current[i];

          tl.to(
            beat,
            {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              duration: beatFade,
              ease: "power2.out",
              immediateRender: false,
            },
            start,
          );
          tl.to(
            bloom,
            { autoAlpha: 0.22, duration: beatFade, immediateRender: false },
            start,
          );
          tl.to(
            beat,
            {
              autoAlpha: 0,
              y: -40,
              filter: "blur(8px)",
              duration: beatFade,
              ease: "power2.in",
              immediateRender: false,
            },
            start + beatHold + beatFade,
          );
          tl.to(
            bloom,
            { autoAlpha: 0, duration: beatFade, immediateRender: false },
            start + beatHold + beatFade,
          );
        });

        // [0.94 → 1.0] Waitlist phase: form fades in under the (still-visible)
        // top-anchored can. Held for the remainder of the pin so the user
        // has room to read + submit. Can does NOT dissolve here — it stays
        // anchored as the visual frame above the form.
        tl.to(
          waitlistRef.current,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.05,
            ease: "power2.out",
            immediateRender: false,
          },
          0.94,
        );

        ScrollTrigger.refresh();
      };

      // 3) Build the scroll timeline immediately so ScrollTrigger pins the
      // hero section from frame 0 — a fast scroller landing on the page
      // won't blow past the pinned region while the entry fade is running.
      buildScrollTl();

      // 4) Mount entrance: a short fade-in for the topdown can + logo.
      // No spin, no descent — the page starts at hero rest.
      const entry = gsap.timeline();
      entry.to(canvasRef.current, { autoAlpha: 1, duration: 0.7, ease: "power2.out" }, 0);
      // Backlight blooms in a touch slower/softer than the can itself.
      entry.to(
        backlightRef.current,
        { autoAlpha: 1, duration: 1.1, ease: "power2.out" },
        0,
      );
      entry.to(
        logoRef.current,
        { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" },
        0.15,
      );

      // (Backlight breathing pulse lives in a state-driven effect below so the
      // dev panel can retune it live.)
    },
    { scope: root },
  );

  // Backlight breathing pulse — recreated whenever its dials change. Driven on
  // transform only, so it never collides with the GSAP autoAlpha fade that owns
  // the halo's opacity/visibility.
  useEffect(() => {
    const el = backlightRef.current;
    if (!el) return;
    if (!bl.pulseOn) {
      gsap.to(el, { scale: 1, duration: 0.4, overwrite: "auto" });
      return;
    }
    const tw = gsap.fromTo(
      el,
      { scale: 1 },
      {
        scale: bl.pulseAmt,
        duration: bl.pulseSpeed,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        overwrite: "auto",
      },
    );
    return () => {
      tw.kill();
    };
  }, [bl.pulseOn, bl.pulseAmt, bl.pulseSpeed]);

  // Backlight look — React owns these; opacity + transform stay GSAP's so
  // slider re-renders never clobber the fade-in or the pulse.
  const blRgb = hexToRgb(bl.color);
  const blStyle: CSSProperties = {
    position: "absolute",
    inset: `${-(8 + bl.size * 28)}% ${-(16 + bl.size * 44)}%`,
    zIndex: 0,
    pointerEvents: "none",
    background: `radial-gradient(closest-side at 50% ${bl.posY}%, rgba(${blRgb}, ${(
      0.62 * bl.intensity
    ).toFixed(3)}), rgba(${blRgb}, ${(0.2 * bl.intensity).toFixed(
      3,
    )}) 46%, transparent ${bl.spread}%)`,
    filter: `blur(${bl.blur}px)`,
    mixBlendMode: "screen",
    willChange: "opacity, transform",
  };

  return (
    <main
      ref={root}
      style={{
        background: "#000",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* TEMPORARY stakeholder control: flip the hero wordmark between the flat
          SVG and the 3D-glass mark. Remove along with HeroGlassLogo / glassLogo. */}
      <button
        type="button"
        onClick={() => setGlassLogo((g) => !g)}
        style={{
          ...MONO,
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 50,
          fontSize: 11,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "#fff",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.22)",
          borderRadius: 999,
          padding: "8px 14px",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        Logo: {glassLogo ? "Glass" : "Flat"}
      </button>

      {/* TEMPORARY (dev tuning): live backlight dials. Delete this panel along
          with the `bl` state, the pulse effect, and hexToRgb/Dial once the look
          is locked in. */}
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          right: 168,
          zIndex: 50,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "10px 16px",
          padding: "10px 14px",
          borderRadius: 12,
          background: "rgba(10,10,12,0.72)",
          border: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <span
          style={{
            ...MONO,
            fontSize: 10,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          Backlight
        </span>
        <label
          style={{
            ...MONO,
            fontSize: 9,
            color: "rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Color
          <input
            type="color"
            value={bl.color}
            onChange={(e) => setBl((s) => ({ ...s, color: e.target.value }))}
            style={{
              width: 28,
              height: 20,
              padding: 0,
              background: "none",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4,
              cursor: "pointer",
            }}
          />
        </label>
        <Dial
          label="Intensity"
          min={0}
          max={1.6}
          step={0.02}
          value={bl.intensity}
          onChange={(v) => setBl((s) => ({ ...s, intensity: v }))}
          fmt={(v) => `${Math.round(v * 100)}%`}
        />
        <Dial
          label="Size"
          min={0}
          max={1}
          step={0.01}
          value={bl.size}
          onChange={(v) => setBl((s) => ({ ...s, size: v }))}
          fmt={(v) => `${Math.round(v * 100)}%`}
        />
        <Dial
          label="Blur"
          min={0}
          max={80}
          step={1}
          value={bl.blur}
          onChange={(v) => setBl((s) => ({ ...s, blur: v }))}
          fmt={(v) => `${v}px`}
        />
        <Dial
          label="Pos Y"
          min={20}
          max={70}
          step={1}
          value={bl.posY}
          onChange={(v) => setBl((s) => ({ ...s, posY: v }))}
          fmt={(v) => `${v}%`}
        />
        <Dial
          label="Spread"
          min={50}
          max={95}
          step={1}
          value={bl.spread}
          onChange={(v) => setBl((s) => ({ ...s, spread: v }))}
          fmt={(v) => `${v}%`}
        />
        <label
          style={{
            ...MONO,
            fontSize: 9,
            color: "rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <input
            type="checkbox"
            checked={bl.pulseOn}
            onChange={(e) => setBl((s) => ({ ...s, pulseOn: e.target.checked }))}
          />
          Pulse
        </label>
        <Dial
          label="Amt"
          min={1}
          max={1.3}
          step={0.005}
          value={bl.pulseAmt}
          onChange={(v) => setBl((s) => ({ ...s, pulseAmt: v }))}
          fmt={(v) => v.toFixed(2)}
        />
        <Dial
          label="Speed"
          min={1}
          max={10}
          step={0.1}
          value={bl.pulseSpeed}
          onChange={(v) => setBl((s) => ({ ...s, pulseSpeed: v }))}
          fmt={(v) => `${v.toFixed(1)}s`}
        />
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(JSON.stringify(bl, null, 2));
          }}
          style={{
            ...MONO,
            fontSize: 9,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "#fff",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 6,
            padding: "5px 9px",
            cursor: "pointer",
          }}
        >
          Copy values
        </button>
      </div>

      <div
        ref={stageRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          background: "#000",
        }}
      >
        {/* Hue blooms — a per-beat colored glow rising from the bottom edge,
            behind the beat copy. Kept low (anchored below the viewport) so it
            never reaches the pinned can at the top: with opaque can frames a
            top glow bled against the black can, so the light lives down here. */}
        {STACK.map((beat, i) => (
          <div
            key={`bloom-${beat.tag}`}
            ref={(el) => {
              bloomRefs.current[i] = el;
            }}
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(130vh 60vh at 50% 118%, ${beat.hue}, transparent 70%)`,
              opacity: 0,
              pointerEvents: "none",
              zIndex: 0,
              mixBlendMode: "screen",
            }}
          />
        ))}

        {/* Logo */}
        <div
          ref={logoRef}
          className="el-hero-logo"
          style={{
            position: "absolute",
            left: "50%",
            // top is set by .el-hero-logo (50% default; 30% on mobile via media query)
            transform: "translate(-50%, -50%)",
            opacity: 0,
            zIndex: 3,
            pointerEvents: "none",
            willChange: "opacity, transform",
          }}
        >
          {glassLogo ? (
            <HeroGlassLogo />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/logo.svg"
              alt="Opus Elevate"
              style={{
                display: "block",
                // Bigger on mobile (78vw min 260px), same on desktop (caps at 420px).
                width: "min(420px, max(78vw, 260px))",
                height: "auto",
                filter: "brightness(0) invert(1)",
                userSelect: "none",
                pointerEvents: "none",
              }}
              draggable={false}
            />
          )}
        </div>

        {/* Can stage */}
        <div
          ref={canStageRef}
          style={{
            position: "absolute",
            left: "50%",
            bottom: HERO_BOTTOM,
            height: HERO_HEIGHT,
            transform: "translateX(-50%)",
            width: "auto",
            aspectRatio: "2 / 3",
            pointerEvents: "none",
            zIndex: 2,
            willChange: "bottom, height, opacity",
          }}
        >
          {/* Backlight — a soft halo behind the can. The rotation frames are
              transparent, so this glow spills around the can's silhouette (the
              opaque can masks its bright centre), reading as a backlit rim that
              lifts the can off the black void. Lives inside the can stage, so it
              tracks the can as it rises and grows on scroll. */}
          <div ref={backlightRef} aria-hidden style={blStyle} />

          {/* Single canvas: the rest-pose frame is painted on mount, then the
              scroll timeline swaps frames on it (smooth top-down → front morph).
              object-fit:contain scales the source-resolution backing store into
              the stage box, exactly as the old <img> frames did. */}
          <canvas
            ref={canvasRef}
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              opacity: 0,
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        </div>

        {/* Beats */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          {STACK.map((beat, i) => (
            <div
              key={beat.tag}
              ref={(el) => {
                beatRefs.current[i] = el;
              }}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "72vh",
                opacity: 0,
                textAlign: "center",
                padding: "0 24px",
                willChange: "opacity, transform, filter",
              }}
            >
              <h2
                style={{
                  ...CN,
                  fontWeight: 900,
                  fontSize: "clamp(36px, 7vw, 84px)",
                  lineHeight: 0.85,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  textTransform: "uppercase",
                  color: "#fff",
                }}
              >
                {beat.name}
                <span style={{ color: beat.hue }}>.</span>
              </h2>
              <div
                style={{
                  marginTop: "clamp(10px, 1.6vh, 18px)",
                  display: "inline-flex",
                  flexDirection: "column",
                  gap: 3,
                  minWidth: "min(280px, 70vw)",
                }}
              >
                {beat.ings.map(([name, mg]) => (
                  <div
                    key={name}
                    style={{
                      ...MONO,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 48,
                      fontSize: 10,
                      lineHeight: 1.4,
                      letterSpacing: ".06em",
                    }}
                  >
                    <span style={{ color: "rgba(255,255,255,0.65)" }}>
                      {name.toUpperCase()}
                    </span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      <span
                        style={{
                          color: beat.hue,
                          fontWeight: 700,
                        }}
                      >
                        {mg}
                      </span>
                      <span
                        style={{
                          color: "var(--dim)",
                          marginLeft: 6,
                          fontSize: 8,
                          letterSpacing: ".24em",
                        }}
                      >
                        MG
                      </span>
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 6,
                    height: 1,
                    background: beat.hue,
                    opacity: 0.45,
                    width: "100%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Waitlist phase — appears under the top-anchored can after the
            three beats, positioned in the same band as the beats. */}
        <div
          ref={waitlistRef}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "72vh",
            opacity: 0,
            textAlign: "center",
            padding: "0 24px",
            pointerEvents: "auto",
            willChange: "opacity, transform",
            zIndex: 3,
          }}
        >
          <div style={{ display: "inline-block" }}>
            <Waitlist
              state={waitlist}
              onSubmitted={(position) =>
                setWaitlist({ submitted: true, position })
              }
              inputId="waitlist-email"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
