"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Waitlist } from "./Waitlist";
import { Starfield } from "./Starfield";
import { CAN_FRAMES } from "../can-frames";
import { GlassMeshPanel } from "../logo/GlassMeshPanel";
import { buildElevateDataUrl } from "../logo/buildSdf";
import { STACK } from "../stack";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const CN: CSSProperties = { fontFamily: "var(--font-cn)" };
const MONO: CSSProperties = { fontFamily: "var(--font-mono)" };

// Brand silver — sampled from the can's aluminum lid (~#c6c6c6); it's also the
// wordmark SVG's native fill (#c4c4c4). Used in place of pure white for the
// brand display elements (the flat logo and the ENERGY/DRIVE/FLOW beat names).
// Defined once in globals.css (:root --silver).
const SILVER = "var(--silver)";

// White base for the can backlight halo (cool white, matches the starfield
// tint). The halo morphs from this to each beat's hue on scroll (see below).
const BACKLIGHT_WHITE: [number, number, number] = [224, 233, 255];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Beat transition styles (stakeholder experiment — cycled via the top-right
// control). Each beat animates a single 0→1 "visibility" proxy on scroll;
// applyBeat() maps that to opacity + scale/blur/translate for the active mode,
// so switching is instant (no timeline rebuild). enter* = the hidden pose it
// grows FROM on the way in; exit* = the hidden pose it goes TO on the way out.
type BeatMode = {
  name: string;
  enterScale: number;
  exitScale: number;
  enterY: number;
  exitY: number;
  enterBlur: number;
  exitBlur: number;
};
const BEAT_MODES: BeatMode[] = [
  // Punch toward the viewer: each word grows from small, then flies past as the
  // next grows in from small. (The stakeholders' "zoom them in" ask.)
  { name: "Zoom In", enterScale: 0.72, exitScale: 1.32, enterY: 0, exitY: 0, enterBlur: 6, exitBlur: 8 },
  // Recede: each word starts large, settles to 1, then shrinks away.
  { name: "Zoom Out", enterScale: 1.3, exitScale: 0.74, enterY: 0, exitY: 0, enterBlur: 6, exitBlur: 8 },
  // Symmetric pulse: grow in from small, shrink back out the same way.
  { name: "Zoom In·Out", enterScale: 0.72, exitScale: 0.72, enterY: 0, exitY: 0, enterBlur: 6, exitBlur: 6 },
  // The original: blur + vertical drift, no scale (baseline for comparison).
  { name: "Fade", enterScale: 1, exitScale: 1, enterY: 40, exitY: -40, enterBlur: 8, exitBlur: 8 },
];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// Beat zoom (stakeholder ask): while the three beats run, the canvas
// crossfades from the front pose to a still of the can's side panel and
// pushes in on the label block for the active beat (ENERGY → DRIVE → FLOW),
// so the can itself presents the three modes. Toggled via the top-right
// control. The still (GPT Image 2, seeded with the deployed can + the
// stack.ts-rendered label art) is chroma-keyed to transparent like the
// rotation frames (scripts/key-greenscreen.mjs) so the backlight halo reads
// through. Master: assets/can/_source/can-side-moments-greenscreen-v2.png.
const SIDE_PANEL_SRC = "/can/side-moments.avif";
// Per-beat focus points on the side still: normalized image coords + zoom.
// Measured on the 2480×3312 still (can spans x 0.18–0.82, blocks centred at
// y ≈ .34/.57/.79). Zooms are gentle (stakeholder: tighter was "way too
// zoomed in") — with the 2:3 buffer the window keeps the can's silhouette
// edges in frame up to z ≈ 1.38; past that it goes interior-only and reads
// as a flat photo crop instead of a magnified can.
const SIDE_FOCUS = [
  { x: 0.5, y: 0.34, z: 1.35 }, // ENERGY block (+ tagline above)
  { x: 0.5, y: 0.57, z: 1.38 }, // DRIVE block
  { x: 0.5, y: 0.79, z: 1.35 }, // FLOW block (+ bottom rim below)
];
// The can's body spans these normalized y bounds in the side still. When a
// zoom window edge lands between them it's cutting the can mid-body, so that
// edge gets a fade-to-transparent band (blends into the page's black)
// instead of a hard line.
const SIDE_CAN_TOP = 0.06;
const SIDE_CAN_BOTTOM = 0.936;
// Between beats the window pulls back out to here (nearly the whole can)
// before pushing in on the next block — an out-and-back-in move (stakeholder
// ask) rather than a flat pan at constant zoom.
const SIDE_Z_MID = 1.08;

// Shared pill style for the (temporary) top-right stakeholder controls.
const PILL: CSSProperties = {
  ...MONO,
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
};

// Using dvh (dynamic viewport) for the hero can positioning so the bottom
// of the can can extend under iOS Safari's collapsible bottom toolbar/URL bar.
// (vh/svh often stop above the toolbar on recent Safari.)
// Original values restored for clean isolation test of the root
// min-height: 100vh + -webkit-fill-available hack.
// (We had temporarily made these more aggressive dvh to force more
// bleed, which may have been masking or conflicting with the root sizing.)
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
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  // TEMPORARY: stakeholder toggle between the flat SVG logo and the 3D-glass one.
  // Defaults to flat; the button flips to glass.
  const [glassLogo, setGlassLogo] = useState(false);
  // Stakeholder toggle for the parallax starfield. Defaults off.
  const [showStarfield, setShowStarfield] = useState(false);
  // Stakeholder experiment: how the ENERGY/DRIVE/FLOW beats transition.
  // Defaults to a zoom (their ask); cycle the top-right control to compare.
  const [beatMode, setBeatMode] = useState(0);
  const beatModeRef = useRef(0);
  const reapplyBeatsRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    beatModeRef.current = beatMode;
    // Re-render the currently-shown beat with the new mode so the switch reads
    // immediately, not only on the next scroll tick.
    reapplyBeatsRef.current?.();
  }, [beatMode]);
  // Stakeholder toggle: zoom into the can's side-panel label during the
  // beats. Defaults on (their ask); the off state is the previous behaviour
  // (static front can) for comparison.
  const [canZoom, setCanZoom] = useState(true);
  const canZoomRef = useRef(true);
  const repaintCanRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    canZoomRef.current = canZoom;
    // Repaint the canvas at the current scroll state so the toggle reads
    // immediately, not only on the next scroll tick.
    repaintCanRef.current?.();
  }, [canZoom]);

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

      // Honour prefers-reduced-motion (same mount-time check as Starfield):
      // autonomous motion (entry fades, the backlight breathing pulse) is
      // skipped; the scroll timeline stays — it's user-driven scrubbing, and
      // it's the only way to reach the beats/waitlist — but tracks the
      // scroll position directly instead of easing toward it.
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      // iOS: showing/hiding the Safari toolbar resizes the visual viewport,
      // which makes ScrollTrigger recompute the pin-spacer and jump the pinned
      // hero (and move the toolbar seam). Freeze that recompute, and on touch
      // normalize scrolling so the bar toggling is suppressed. No-ops on desktop
      // (ignoreMobileResize only affects mobile; normalizeScroll is touch-gated).
      ScrollTrigger.config({ ignoreMobileResize: true });
      if (ScrollTrigger.isTouch === 1) {
        ScrollTrigger.normalizeScroll(true);
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

      // Side-panel still for the beat zoom — same off-DOM pattern as the
      // rotation frames (only ever painted to the one canvas, never mounted).
      const sideImg = new Image();
      sideImg.decoding = "async";
      sideImg.src = SIDE_PANEL_SRC;
      // Rack-focus spotlight (stakeholder direction): during the beats the
      // can renders dimmed and soft-blurred everywhere EXCEPT a soft-edged
      // spotlight tracking the active label block, so only the focused
      // section reads — the neighbouring blocks fall to near-black instead
      // of competing. dimCanvas pre-renders once (downscale-bounce blur +
      // black wash; no ctx.filter, which iOS Safari only gained recently);
      // spotCanvas re-masks the sharp layer each paint. Both are off-DOM
      // scratch canvases — the on-page canvas stays singular.
      let dimCanvas: HTMLCanvasElement | null = null;
      let spotCanvas: HTMLCanvasElement | null = null;

      // Scroll-driven canvas state. The rise tween scrubs `frameState.i`
      // through the rotation; the beat-zoom tweens scrub `sideState`
      // (crossfade mix + zoom window). One painter composites both, so any
      // scrub position — forwards or backwards — repaints consistently.
      const frameState = { i: 0 };
      const sideState = {
        mix: 0,
        x: SIDE_FOCUS[0].x,
        y: SIDE_FOCUS[0].y,
        z: 1,
      };

      let bufferSized = false;
      const lastPaint = { i: -1, mix: -1, x: -1, y: -1, z: -1 };
      const paintCan = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const n = images.length;
        let i = Math.min(n - 1, Math.max(0, Math.round(frameState.i)));
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
          // Backing store matches the stage box's 2:3 aspect, NOT the 3:4
          // frames: with a 3:4 buffer, object-fit:contain letterboxed the
          // paint inside the taller stage, so the beat zoom was cut off in
          // bands and could never reach the top of the viewport. The
          // rotation frames draw contain-style inside the buffer instead
          // (width-fit, centred below) — identical on-screen geometry to
          // the old buffer, while the zoom window can fill the full stage.
          canvas.width = img.naturalWidth;
          canvas.height = Math.round((img.naturalWidth * 3) / 2);
          bufferSized = true;
        }
        // The zoom toggle gates the side layer here (not in the timeline) so
        // flipping it mid-beat repaints instantly; until the still decodes,
        // the front pose simply stays up (no blank flash).
        const mix = canZoomRef.current && isReady(sideImg) ? sideState.mix : 0;
        const { x, y, z } = sideState;
        if (
          i === lastPaint.i &&
          mix === lastPaint.mix &&
          (mix === 0 ||
            (x === lastPaint.x && y === lastPaint.y && z === lastPaint.z))
        )
          return;
        Object.assign(lastPaint, { i, mix, x, y, z });
        // Both layers carry alpha (transparent background), so clear before
        // each paint to avoid the previous state ghosting through.
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (mix < 1) {
          // Front pose dissolves out as the side panel dissolves in — drawing
          // it under the side layer at full alpha would leave its silhouette
          // peeking around the zoomed panel's edges. Centred in the taller
          // buffer (see buffer sizing above).
          ctx.globalAlpha = 1 - mix;
          ctx.drawImage(
            img,
            0,
            (canvas.height - img.naturalHeight) / 2,
            canvas.width,
            img.naturalHeight,
          );
        }
        if (mix > 0) {
          // Map a zoomed source window — cover-fit, centred on the focus
          // point, clamped inside the still — onto the full backing store.
          const iw = sideImg.naturalWidth;
          const ih = sideImg.naturalHeight;
          const cover = Math.max(canvas.width / iw, canvas.height / ih);
          const winW = canvas.width / (cover * z);
          const winH = canvas.height / (cover * z);
          const sx = clamp(x * iw - winW / 2, 0, iw - winW);
          const sy = clamp(y * ih - winH / 2, 0, ih - winH);

          if (!dimCanvas || !spotCanvas) {
            // Dim base layer, built once: the still at half res, blurred by
            // bouncing through a 1/12-scale buffer, then washed toward black
            // (source-atop keeps the keyed background transparent).
            dimCanvas = document.createElement("canvas");
            dimCanvas.width = Math.round(iw / 2);
            dimCanvas.height = Math.round(ih / 2);
            const tiny = document.createElement("canvas");
            tiny.width = Math.max(1, Math.round(iw / 12));
            tiny.height = Math.max(1, Math.round(ih / 12));
            tiny.getContext("2d")?.drawImage(sideImg, 0, 0, tiny.width, tiny.height);
            const dctx = dimCanvas.getContext("2d");
            if (dctx) {
              dctx.drawImage(tiny, 0, 0, dimCanvas.width, dimCanvas.height);
              dctx.globalCompositeOperation = "source-atop";
              dctx.fillStyle = "rgba(0,0,0,0.75)";
              dctx.fillRect(0, 0, dimCanvas.width, dimCanvas.height);
            }
            spotCanvas = document.createElement("canvas");
            spotCanvas.width = canvas.width;
            spotCanvas.height = canvas.height;
          }

          // 1) Dim, blurred can across the whole window.
          ctx.globalAlpha = mix;
          ctx.drawImage(
            dimCanvas,
            sx / 2, sy / 2, winW / 2, winH / 2,
            0, 0, canvas.width, canvas.height,
          );
          // 2) Sharp layer, masked to a soft spotlight around the focus
          // point (the same x/y the pan tweens drive, mapped through the
          // window — so the spotlight glides down the can with the scroll).
          const sctx = spotCanvas.getContext("2d");
          if (sctx) {
            sctx.globalCompositeOperation = "source-over";
            sctx.clearRect(0, 0, spotCanvas.width, spotCanvas.height);
            sctx.drawImage(sideImg, sx, sy, winW, winH, 0, 0, spotCanvas.width, spotCanvas.height);
            const cx = ((x * iw - sx) / winW) * spotCanvas.width;
            const cy = ((y * ih - sy) / winH) * spotCanvas.height;
            // Sized to one block: the solid core covers icon + name +
            // ingredient list, and alpha hits zero right about where the
            // next block's icon starts — the neighbours live only in the
            // dim layer ("only the current section reads" — stakeholder).
            const r = spotCanvas.height * 0.24;
            const spot = sctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            spot.addColorStop(0, "rgba(0,0,0,1)");
            spot.addColorStop(0.55, "rgba(0,0,0,1)");
            spot.addColorStop(1, "rgba(0,0,0,0)");
            sctx.globalCompositeOperation = "destination-in";
            sctx.fillStyle = spot;
            sctx.fillRect(0, 0, spotCanvas.width, spotCanvas.height);
            ctx.drawImage(spotCanvas, 0, 0);
          }
          ctx.globalAlpha = 1;
          // Window edges that cut the can mid-body dissolve into the page's
          // black: erase alpha through a gradient band at that edge. Edges
          // that show the can's own top/bottom (or its transparent margin)
          // stay crisp — fading those would melt the real silhouette.
          const band = canvas.height * 0.1;
          const fadeEdge = (top: boolean) => {
            const y0 = top ? 0 : canvas.height;
            const y1 = top ? band : canvas.height - band;
            const g = ctx.createLinearGradient(0, y0, 0, y1);
            g.addColorStop(0, "rgba(0,0,0,1)");
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = g;
            ctx.fillRect(0, Math.min(y0, y1), canvas.width, band);
            ctx.globalCompositeOperation = "source-over";
          };
          if (sy / ih > SIDE_CAN_TOP + 0.005) fadeEdge(true);
          if ((sy + winH) / ih < SIDE_CAN_BOTTOM - 0.005) fadeEdge(false);
        }
        ctx.globalAlpha = 1;
      };
      // Let the React zoom toggle repaint whatever the scroll state shows.
      repaintCanRef.current = () => {
        lastPaint.i = -1;
        paintCan();
      };

      // Paint the rest-pose frame as soon as it decodes (entry fades it in).
      if (isReady(images[0])) paintCan();
      else images[0].addEventListener("load", () => paintCan(), { once: true });

      // Handle to the entry timeline's logo fade-in (assigned below). The
      // scroll timeline's logo fade-out kills it on first scroll: both tweens
      // own the logo's alpha, and if a fast scroll outruns the 0.85s entry,
      // the time-based tween finishes last and parks the logo at full
      // opacity over the beats (nothing re-renders it until the user scrubs
      // back through the top of the timeline).
      let logoEntryTween: gsap.core.Tween | null = null;

      // Backlight tint proxy. The halo behind the can is cool-white on the home
      // screen, then morphs to each beat's hue while that beat is shown and back
      // to white between/after (driven from the scroll timeline below). We rewrite
      // the radial-gradient each frame instead of tweening `background` directly:
      // GSAP owns this element's opacity (autoAlpha) and transform (breathing
      // scale), both independent of `background`, so writing it here is safe — and
      // React won't clobber it on re-render since the style-prop value never
      // changes (React only re-applies style keys whose values differ).
      const blColor = {
        r: BACKLIGHT_WHITE[0],
        g: BACKLIGHT_WHITE[1],
        b: BACKLIGHT_WHITE[2],
      };
      const setBacklight = () => {
        const el = backlightRef.current;
        if (!el) return;
        const c = `${Math.round(blColor.r)}, ${Math.round(blColor.g)}, ${Math.round(blColor.b)}`;
        el.style.background = `radial-gradient(closest-side at 50% 56%, rgba(${c}, 0.719), rgba(${c}, 0.232) 46%, transparent 50%)`;
      };

      // Per-beat visibility proxies + renderer. The scroll timeline tweens each
      // beat's `v` 0→1 (enter) and 1→0 (exit); applyBeat maps that to the active
      // mode's opacity/scale/blur/translate. We write inline styles directly —
      // GSAP only touches these proxies, not the beat elements, and React won't
      // clobber them (its style prop keeps opacity:0 and never changes). Driving
      // a normalized proxy (not the element) is what lets the mode swap live.
      const beatViz = beatRefs.current.map(() => ({
        v: 0,
        phase: "enter" as "enter" | "exit",
      }));
      const applyBeat = (i: number, phase: "enter" | "exit") => {
        const el = beatRefs.current[i];
        if (!el) return;
        const s = beatViz[i];
        s.phase = phase;
        const v = s.v;
        const m = BEAT_MODES[beatModeRef.current] ?? BEAT_MODES[0];
        const k = 1 - v; // exit progress (v runs 1→0 on the way out)
        const scale =
          phase === "enter" ? lerp(m.enterScale, 1, v) : lerp(1, m.exitScale, k);
        const y = phase === "enter" ? lerp(m.enterY, 0, v) : lerp(0, m.exitY, k);
        const blur =
          phase === "enter" ? lerp(m.enterBlur, 0, v) : lerp(0, m.exitBlur, k);
        el.style.opacity = String(v);
        el.style.visibility = v > 0.001 ? "visible" : "hidden";
        el.style.transform = `translateY(${y.toFixed(2)}px) scale(${scale.toFixed(4)})`;
        el.style.filter = blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : "none";
      };
      // Let the React mode toggle re-render whatever beat is on screen.
      reapplyBeatsRef.current = () =>
        beatViz.forEach((s, i) => applyBeat(i, s.phase));

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
      // Beats start hidden, in the active mode's "enter" pose (v=0).
      beatRefs.current.forEach((_, i) => applyBeat(i, "enter"));
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
            scrub: reduceMotion ? true : 1,
            anticipatePin: 1,
            // First scrolled pixel: the scroll timeline owns the logo from
            // here, so retire the entry fade-in (see logoEntryTween). Done
            // here, not in the logo tween's onStart — a scrubbed jump can
            // skip straight past the tween with its callbacks suppressed.
            onUpdate: (self) => {
              if (self.progress > 0.001 && logoEntryTween) {
                logoEntryTween.kill();
                logoEntryTween = null;
              }
            },
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

        // [0.08 → 0.30] Rise: can lifts + grows, while the frame morph below
        // tilts the camera topdown → front. FromTo with explicit FROM locks
        // in the HERO pose so scrolling back up always restores it.
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
        tl.to(
          frameState,
          {
            i: images.length - 1,
            duration: 0.18, // xfade window 0.12 → 0.30
            ease: "none",
            immediateRender: false,
            onUpdate: paintCan,
          },
          0.12,
        );

        // [0.30 → 0.94] Beat zoom: as the rise settles, the canvas dissolves
        // from the front pose to the side-panel still while pushing in on the
        // ENERGY block; the window pans down to DRIVE and FLOW in the gaps
        // between beats, then pulls back out to the front pose just before
        // the waitlist. All scrubbed, so scrolling back up reverses each step.
        tl.to(
          sideState,
          {
            mix: 1,
            z: SIDE_FOCUS[0].z,
            duration: 0.06,
            immediateRender: false,
            onUpdate: paintCan,
          },
          0.3,
        );
        // Between beats: pan to the next block while the zoom dips out to
        // SIDE_Z_MID and pushes back in — out-and-back-in, not a flat pan.
        [
          { to: SIDE_FOCUS[1], at: 0.5 },
          { to: SIDE_FOCUS[2], at: 0.7 },
        ].forEach(({ to, at }) => {
          tl.to(
            sideState,
            {
              x: to.x,
              y: to.y,
              duration: 0.08,
              immediateRender: false,
              onUpdate: paintCan,
            },
            at,
          );
          tl.to(
            sideState,
            {
              z: SIDE_Z_MID,
              duration: 0.04,
              ease: "power1.in",
              immediateRender: false,
              onUpdate: paintCan,
            },
            at,
          );
          tl.to(
            sideState,
            {
              z: to.z,
              duration: 0.04,
              ease: "power1.out",
              immediateRender: false,
              onUpdate: paintCan,
            },
            at + 0.04,
          );
        });
        tl.to(
          sideState,
          {
            mix: 0,
            z: 1,
            duration: 0.05,
            immediateRender: false,
            onUpdate: paintCan,
          },
          0.89,
        );

        // [0.34 → 0.94] Three beats, edge-to-edge (no overlap). Each beat's
        // OUT completes exactly when the next beat's IN starts, so the
        // previous beat is fully gone before the next one fades in.
        const beatStarts = [0.34, 0.54, 0.74];
        const beatHold = 0.10;
        const beatFade = 0.05;
        beatStarts.forEach((start, i) => {
          const bloom = bloomRefs.current[i];
          const viz = beatViz[i];
          const [hr, hg, hb] = hexToRgb(STACK[i].hue);

          // Beat IN: drive v 0→1; applyBeat renders it per the active mode.
          tl.to(
            viz,
            {
              v: 1,
              duration: beatFade,
              ease: "power2.out",
              immediateRender: false,
              onUpdate: () => applyBeat(i, "enter"),
            },
            start,
          );
          tl.to(
            bloom,
            { autoAlpha: 0.22, duration: beatFade, immediateRender: false },
            start,
          );
          // Backlight halo morphs white → this beat's hue as the beat fades in,
          // so the rim light around the can picks up the section's colour.
          tl.to(
            blColor,
            {
              r: hr,
              g: hg,
              b: hb,
              duration: beatFade,
              ease: "power2.out",
              immediateRender: false,
              onUpdate: setBacklight,
            },
            start,
          );
          // Beat OUT: drive v 1→0.
          tl.to(
            viz,
            {
              v: 0,
              duration: beatFade,
              ease: "power2.in",
              immediateRender: false,
              onUpdate: () => applyBeat(i, "exit"),
            },
            start + beatHold + beatFade,
          );
          tl.to(
            bloom,
            { autoAlpha: 0, duration: beatFade, immediateRender: false },
            start + beatHold + beatFade,
          );
          // ...and back to cool-white as the beat fades out, so the gaps between
          // beats — and the home/waitlist phases — keep the original white halo.
          tl.to(
            blColor,
            {
              r: BACKLIGHT_WHITE[0],
              g: BACKLIGHT_WHITE[1],
              b: BACKLIGHT_WHITE[2],
              duration: beatFade,
              ease: "power2.in",
              immediateRender: false,
              onUpdate: setBacklight,
            },
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
      // No spin, no descent — the page starts at hero rest. Under reduced
      // motion, snap straight to the rest state (no fades, no breathing).
      if (reduceMotion) {
        gsap.set([canvasRef.current, backlightRef.current], { autoAlpha: 1 });
        gsap.set(logoRef.current, { autoAlpha: 1, y: 0 });
      } else {
        const entry = gsap.timeline();
        entry.to(canvasRef.current, { autoAlpha: 1, duration: 0.7, ease: "power2.out" }, 0);
        // Backlight blooms in a touch slower/softer than the can itself.
        entry.to(
          backlightRef.current,
          { autoAlpha: 1, duration: 1.1, ease: "power2.out" },
          0,
        );
        logoEntryTween = gsap.to(logoRef.current, {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          paused: true,
        });
        entry.add(logoEntryTween.play(), 0.15);

        // Slow breathing on the backlight so the glow feels alive rather than
        // a static decal. Driven on scale (transform) so it never fights the
        // autoAlpha fade that owns the halo's opacity.
        gsap.fromTo(
          backlightRef.current,
          { scale: 1 },
          {
            scale: 1.105,
            duration: 2,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          },
        );
      }
    },
    { scope: root },
  );

  return (
    <main
      ref={root}
      style={{
        background: "#000",
        color: "#fff",
        position: "relative",
        // Was "hidden" — this clipped the can's large negative-bottom hang
        // (bottom: -54vh) so it could never reach/paint behind the iOS Safari
        // bottom toolbar even when we extended other layers. Now allowing
        // vertical overflow (while still clipping horizontally for narrow
        // screens where the can is wider than the viewport) so the existing
        // rest-pose can silhouette can extend behind the URL bar.
        // Combined with html/body { background: transparent } this lets
        // Safari respect the painted content under the chrome.
        overflowX: "hidden",
        overflowY: "visible",
      }}
    >
      {/* Parallax starfield — fixed behind everything (main's #000 is the base).
          Section backgrounds must stay transparent for it to show through.
          Off by default; toggled on via the top-right control. */}
      {showStarfield && <Starfield />}

      {/* TEMPORARY stakeholder controls (top-right): toggle the starfield, and
          flip the hero wordmark between the flat SVG and the 3D-glass mark.
          Remove along with HeroGlassLogo / glassLogo. */}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setShowStarfield((s) => !s)}
          style={PILL}
        >
          Stars: {showStarfield ? "On" : "Off"}
        </button>
        <button
          type="button"
          onClick={() => setGlassLogo((g) => !g)}
          style={PILL}
        >
          Logo: {glassLogo ? "Glass" : "Flat"}
        </button>
        <button
          type="button"
          onClick={() => setBeatMode((m) => (m + 1) % BEAT_MODES.length)}
          style={PILL}
        >
          Beats: {BEAT_MODES[beatMode].name}
        </button>
        <button
          type="button"
          onClick={() => setCanZoom((z) => !z)}
          style={PILL}
        >
          Can Zoom: {canZoom ? "On" : "Off"}
        </button>
      </div>

      <div
        ref={stageRef}
        style={{
          position: "relative",
          width: "100%",
          /* Updated to 100dvh to match the body height: 100dvh recommendation.
             Goal: let the pinned hero stage (and the can with its negative
             bottom positioning) extend fully beneath the Safari toolbar. */
          height: "100dvh",
          boxSizing: "border-box",
          // Transparent so the fixed Starfield (behind) shows through; the
          // parent <main> supplies the #000 base.
          background: "transparent",
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
                // Bumped up a touch (was 420/78vw/260) so the flat mark reads
                // closer in size to the larger 3D-glass version.
                width: "min(480px, max(84vw, 290px))",
                height: "auto",
                // No filter: the SVG's native fill (#c4c4c4) is the can's silver.
                // (Was brightness(0) invert(1), which forced it to pure white.)
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
              lifts the can off the black void. Lives inside the can stage so it
              tracks the can as it rises and grows; faded in via GSAP autoAlpha
              and breathes via the GSAP scale pulse above. */}
          <div
            ref={backlightRef}
            aria-hidden
            style={{
              position: "absolute",
              inset: "-8% -16%",
              zIndex: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(closest-side at 50% 56%, rgba(224, 233, 255, 0.719), rgba(224, 233, 255, 0.232) 46%, transparent 50%)",
              filter: "blur(80px)",
              mixBlendMode: "screen",
              willChange: "opacity, transform",
            }}
          />

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
            /* Per suggestion: add safe-area padding at bottom so the beat
               text doesn't get hidden behind the Safari toolbar when it
               appears. The can itself is intentionally low/negative so it
               can sit behind the bar. */
            paddingBottom: "env(safe-area-inset-bottom)",
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
                  color: SILVER,
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
                {beat.ings.map(({ name, mg }) => (
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
            /* Safe-area padding at bottom so the form isn't hidden behind
               the Safari toolbar (per the padding part of the suggestion).
               Decorative low elements like the can can still bleed under. */
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div style={{ display: "inline-block" }}>
            <Waitlist
              submitted={waitlistSubmitted}
              onSubmitted={() => setWaitlistSubmitted(true)}
              inputId="waitlist-email"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
