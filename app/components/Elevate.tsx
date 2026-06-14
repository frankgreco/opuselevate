"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Waitlist } from "./Waitlist";
import { Starfield } from "./Starfield";
import { CAN_FRAMES, FRONT_FRAME, PANEL_FRAME } from "../can-frames";
import { MomentsPanel } from "./MomentsPanel";
import { GlassMeshPanel } from "../logo/GlassMeshPanel";
import { buildElevateDataUrl } from "../logo/buildSdf";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const MONO: CSSProperties = { fontFamily: "var(--font-mono)" };

// Panel reveal: the can shows its printed panel, zooms in while dissolving to a
// blank can, then fades to black. The live-text ingredients panel (MomentsPanel —
// crisp DOM text) then takes over the black screen as a full-screen vertical
// carousel: three CENTERED slides (ENERGY → DRIVE → FLOW), one on screen at a time,
// panned by translating a clipped full-viewport layer. It is decoupled from the can
// stage so the text is its own (leaf) transform — razor-sharp at full size.
//   ZOOM_SCALE  — how far the CAN pushes in as it dissolves to black.
//   ZOOM_ORIGIN — transform-origin (panel-face centre on the can stage).
const ZOOM_SCALE = 4.4;
const ZOOM_ORIGIN = "50% 44%";
// Keep the can vertically centred as it zooms. The PIN rest is already centred
// (~50vh), but scaling about the 44%-high origin drifts the can centre downward,
// so setZoom adds a translateY of (A − B·s) vh that counters the drift and holds
// the centre at ~50vh across the zoom — ramped in past s≈1 so it doesn't jump
// from the resting position. Tuned in-browser.
const ZOOM_CENTER_A = 4;
const ZOOM_CENTER_B = 4;
const ZOOM_CENTER_RAMP_END = 1.22; // scale by which the centring is fully engaged

// Blank wet face (the printed panel frame's twin, just no text — same face-on
// orientation, so it's pixel-aligned). Crossfaded over the held printed panel so
// the DRIVE/ENERGY/FLOW text dissolves OFF the can to blank before it fades to
// black. Keyed from assets/can/_work/extension-blank.mp4 (no regeneration).
const BLANK_SRC = "/can/blank-face.avif";

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
const HERO_BOTTOM = "-54vh";
const HERO_HEIGHT = "110vh";
// Front/panel view: the can rises to sit CENTERED in the viewport. (It used to
// be top-anchored to leave room for the ENERGY/DRIVE/FLOW beat text below the
// can; those DOM blocks are gone, so the can now centers — a 68vh box centered
// in 100vh sits 16vh off each edge.)
const PIN_BOTTOM = "16vh";
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

  const root = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const canStageRef = useRef<HTMLDivElement>(null);
  // The can rotation is CAN_FRAMES.length frames sliced from the source clips,
  // ordered top-down rest pose (index 0) → straight-on front (FRONT_FRAME) →
  // ⅓ turn onto the ingredients panel face (PANEL_FRAME). They are loaded as
  // off-DOM Image objects and painted, one at a time, to a single <canvas> as
  // scroll progresses. (Mounting all frames as stacked <img> layers — one GPU
  // compositor layer each — blew past iOS Safari's per-tab memory ceiling and
  // crashed the page on load.)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backlightRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  // Live-text ingredients panel — a full-screen clipped layer (panelRef) whose
  // inner stack of three slides (panelInnerRef) is translated to pan ENERGY→DRIVE
  // →FLOW, one centered block at a time, on the black.
  const panelRef = useRef<HTMLDivElement>(null);
  const panelInnerRef = useRef<HTMLDivElement>(null);
  // Black overlay that fades OVER the can to make it "disappear" at the reveal.
  // A dedicated element (not the canvas's own opacity) so it never fights the
  // mount entry-fade that owns the canvas/backlight autoAlpha.
  const blackoutRef = useRef<HTMLDivElement>(null);
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
      // it's the only way to reach the panel/waitlist — but tracks the
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
      // memory is bounded by the browser's own cache rather than 146 live
      // compositor layers. Compressed source bytes (~8 MB total) are trivial.
      const images = CAN_FRAMES.map((src) => {
        const img = new Image();
        img.decoding = "async";
        img.src = src;
        return img;
      });
      imagesRef.current = images;

      const isReady = (im?: HTMLImageElement) =>
        !!im && im.complete && im.naturalWidth > 0;

      // Scroll-driven canvas state. The rotation tween scrubs `frameState.i`
      // through the frames; the painter draws whichever frame that lands on, so
      // any scrub position — forwards or backwards — repaints consistently.
      const frameState = { i: 0 };

      // Blank-face still, crossfaded over the held printed panel (text dissolves
      // off to a blank can). Off-DOM like the rotation frames; drawn with the
      // SAME geometry so it's pixel-aligned with the printed frame.
      const blankImg = new Image();
      blankImg.decoding = "async";
      blankImg.src = BLANK_SRC;
      const blankState = { mix: 0 }; // 0 = printed panel, 1 = blank can

      let bufferSized = false;
      const lastPaint = { i: -1, mix: -1 };
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
          // frames: the rotation frames draw contain-style inside the buffer
          // (width-fit, centred below) — identical on-screen geometry to a
          // native-size buffer, while leaving headroom for object-fit:contain
          // in the taller stage.
          canvas.width = img.naturalWidth;
          canvas.height = Math.round((img.naturalWidth * 3) / 2);
          bufferSized = true;
        }
        // The blank crossfade only makes sense on the held panel face — gate it
        // by the frame index so a stale blankState (e.g. after a reload at a
        // scrolled position) can never blank out the hero or the rotating can.
        const onPanel = i >= PANEL_FRAME - 1;
        const mix = onPanel && isReady(blankImg) ? blankState.mix : 0;
        if (i === lastPaint.i && mix === lastPaint.mix) return;
        lastPaint.i = i;
        lastPaint.mix = mix;
        // The frames carry alpha (transparent background), so clear before each
        // paint to avoid the previous frame ghosting through. Centred in the
        // taller buffer (see buffer sizing above).
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          img,
          0,
          (canvas.height - img.naturalHeight) / 2,
          canvas.width,
          img.naturalHeight,
        );
        // Crossfade the printed panel → blank can: draw the blank still over the
        // frame at `mix`. Same geometry (it's the same can, textless), so it's
        // pixel-aligned and only the text dissolves off.
        if (mix > 0) {
          ctx.globalAlpha = mix;
          ctx.drawImage(
            blankImg,
            0,
            (canvas.height - blankImg.naturalHeight) / 2,
            canvas.width,
            blankImg.naturalHeight,
          );
          ctx.globalAlpha = 1;
        }
      };

      // Paint the rest-pose frame as soon as it decodes (entry fades it in).
      if (isReady(images[0])) paintCan();
      else images[0].addEventListener("load", () => paintCan(), { once: true });

      // Panel-zoom proxy + renderer. The timeline tweens these; setZoom writes the
      // can stage's transform directly so the real can magnifies into the panel
      // (GSAP only animates bottom/height/autoAlpha on the stage, never transform,
      // so writing it here is safe; React keeps the static translateX(-50%) and
      // won't clobber it). `s` is the push-in scale, `ty` the screen-space vertical
      // pan (vh) that brings each block to centre.
      const zoomState = { s: 1, ty: 0 };
      const setZoom = () => {
        const el = canStageRef.current;
        if (!el) return;
        const s = zoomState.s;
        // Drop the can to the viewport centre as it zooms (ramp in past s≈1 so it
        // doesn't jump from its upper resting pose). At s=1 this is 0 (rest).
        const t = Math.min(1, Math.max(0, (s - 1) / (ZOOM_CENTER_RAMP_END - 1)));
        const ramp = t * t * (3 - 2 * t);
        const ty = zoomState.ty + (ZOOM_CENTER_A - ZOOM_CENTER_B * s) * ramp;
        el.style.transformOrigin = ZOOM_ORIGIN;
        el.style.transform = `translateX(-50%) translateY(${ty.toFixed(2)}vh) scale(${s.toFixed(4)})`;
      };

      // Live-text carousel proxy + renderer. `op` fades the whole panel in/out; `y`
      // is the slide index (0 ENERGY → 1 DRIVE → 2 FLOW) — the clipped layer shows
      // one 100vh slide and translating the inner by y·100vh pans between them.
      const panelState = { op: 0, y: 0 };
      const setPanel = () => {
        const el = panelRef.current;
        const inner = panelInnerRef.current;
        if (el) {
          el.style.opacity = String(panelState.op);
          el.style.visibility = panelState.op > 0.001 ? "visible" : "hidden";
        }
        if (inner) inner.style.transform = `translateY(${(-panelState.y * 100).toFixed(3)}vh)`;
      };

      // Handle to the entry timeline's logo fade-in (assigned below). The
      // scroll timeline's logo fade-out kills it on first scroll: both tweens
      // own the logo's alpha, and if a fast scroll outruns the 0.85s entry,
      // the time-based tween finishes last and parks the logo at full
      // opacity over the panel (nothing re-renders it until the user scrubs
      // back through the top of the timeline).
      let logoEntryTween: gsap.core.Tween | null = null;

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
      setZoom(); // scale 1, no pan
      setPanel(); // hidden, framed on ENERGY (slide 0)
      gsap.set(blackoutRef.current, { autoAlpha: 0 }); // can visible until reveal
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
              // At the very top, force the hero frame. A reload at a scrolled
              // position can render the timeline mid-way (browser scroll
              // restoration) and then settle back to progress 0, but the
              // proxy-driven canvas is left painted on a stale blank/panel
              // frame because the immediateRender:false tweens don't re-assert
              // their rest values. onUpdate fires reliably under scrub, so this
              // repaints the rest pose whenever we're back at the top.
              if (self.progress < 0.0006) {
                frameState.i = 0;
                blankState.mix = 0;
                zoomState.s = 1;
                zoomState.ty = 0;
                panelState.op = 0;
                panelState.y = 0;
                setZoom();
                setPanel();
                paintCan();
              }
            },
          },
        });

        // HERO ANCHORS at position 0. The canvas frame, blank crossfade and zoom
        // are driven by plain proxies via onUpdate; their tweens are
        // immediateRender:false, so when the timeline lands back on progress 0
        // after a reload that briefly rendered it mid-way (browser scroll
        // restoration), those tweens DON'T re-assert their rest values and the
        // hero paints a stale blank/zoomed/panel frame. These position-0 set/call
        // entries always render at progress 0, forcing the rest state + a repaint.
        tl.set(frameState, { i: 0 }, 0);
        tl.set(blankState, { mix: 0 }, 0);
        tl.set(zoomState, { s: 1, ty: 0 }, 0);
        tl.set(panelState, { op: 0, y: 0 }, 0);
        tl.call(() => { setZoom(); setPanel(); paintCan(); }, undefined, 0);

        // [0 → 0.06] Logo fades out. Anchored at progress 0 (no dead zone)
        // so the fully-scrolled-up state IS the tween's FROM state
        // (autoAlpha: 1) — i.e. scrolling all the way back up always
        // restores the logo. fromTo with explicit FROM + immediateRender:false
        // so the entry fade-in isn't snapped over at scroll TL creation.
        tl.fromTo(
          logoRef.current,
          { autoAlpha: 1, y: 0 },
          { autoAlpha: 0, duration: 0.06, immediateRender: false },
          0,
        );

        // [0.06 → 0.24] Rise: can lifts + grows, while the frame morph below
        // tilts the camera topdown → front. FromTo with explicit FROM locks
        // in the HERO pose so scrolling back up always restores it.
        tl.fromTo(
          canStageRef.current,
          { bottom: HERO_BOTTOM, height: HERO_HEIGHT },
          {
            bottom: PIN_BOTTOM,
            height: PIN_HEIGHT,
            duration: 0.18,
            ease: "power2.inOut",
            immediateRender: false,
          },
          0.06,
        );
        // [0.08 → 0.30] Original spin: drive the frame index 0 → FRONT_FRAME
        // (top-down → front, via the back). With ~100 frames each step is a
        // tiny camera-tilt delta, so the scrubbed swap reads as a smooth
        // perspective shift (video-like) rather than discrete jumps.
        tl.fromTo(
          frameState,
          { i: 0 },
          {
            i: FRONT_FRAME,
            duration: 0.22,
            ease: "none",
            immediateRender: false,
            onUpdate: paintCan,
          },
          0.08,
        );
        // [0.30 → 0.40] Continued ⅓ turn: FRONT_FRAME → PANEL_FRAME, rotating
        // the front around onto the printed FOR MOMENTS panel face — the can is
        // at full size (scale 1), fully in frame, presenting the panel. Held
        // [0.40 → 0.42] so the printed DRIVE/ENERGY/FLOW panel reads.
        tl.to(
          frameState,
          {
            i: PANEL_FRAME,
            duration: 0.1,
            ease: "none",
            immediateRender: false,
            onUpdate: paintCan,
          },
          0.3,
        );

        // [0.40 → 0.45] HOLD on the printed DRIVE/ENERGY/FLOW panel (scale 1, fully
        // in frame) — a longer beat so the printed panel reads before anything moves.

        // [0.45 → 0.58] The can ZOOMS IN (scale 1 → ZOOM_SCALE) while its printed
        // text DISSOLVES OFF to a blank can — the crossfade finishes fast (by ~0.49).
        // NOTE: default immediateRender (not false) on these two proxy tweens — their
        // FROM is the hero rest state, so they revert cleanly if the page is RELOADED
        // at a scrolled position; with immediateRender:false they'd leave the canvas
        // painted on a stale blank/zoomed can at the top.
        tl.fromTo(
          zoomState,
          { s: 1, ty: 0 },
          { s: ZOOM_SCALE, ty: 0, duration: 0.13, ease: "power1.in", onUpdate: setZoom },
          0.45,
        );
        tl.fromTo(
          blankState,
          { mix: 0 },
          { mix: 1, duration: 0.04, ease: "power1.inOut", onUpdate: paintCan },
          0.45,
        );

        // [0.485 → 0.51] The blank can FADES TO NOTHING — a flash, gone well before
        // the zoom reaches full. Then [0.51 → 0.57] the live-text carousel fades in
        // on the black, framed on the ENERGY slide (one centered block, nothing else).
        tl.fromTo(
          blackoutRef.current,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.025, ease: "power2.in", immediateRender: false },
          0.485,
        );
        tl.fromTo(
          panelState,
          { op: 0 },
          { op: 1, duration: 0.06, ease: "power1.out", onUpdate: setPanel },
          0.51,
        );

        // [0.62 → 0.75] Pan ONE centered slide at a time: ENERGY → DRIVE → FLOW.
        tl.to(
          panelState,
          { y: 1, duration: 0.05, immediateRender: false, onUpdate: setPanel },
          0.62,
        );
        tl.to(
          panelState,
          { y: 2, duration: 0.05, immediateRender: false, onUpdate: setPanel },
          0.7,
        );

        // [0.78 → 1.0] Reverse out: the text fades; then the black lifts and the can
        // un-zooms + blank→printed and spins from the panel to the front for the
        // waitlist. Text is gone before the can returns (no overlap).
        tl.fromTo(
          panelState,
          { op: 1 },
          { op: 0, duration: 0.05, ease: "power1.in", immediateRender: false, onUpdate: setPanel },
          0.78,
        );
        tl.fromTo(
          blackoutRef.current,
          { autoAlpha: 1 },
          { autoAlpha: 0, duration: 0.05, ease: "power1.out", immediateRender: false },
          0.83,
        );
        tl.to(
          zoomState,
          { s: 1, ty: 0, duration: 0.08, ease: "power1.inOut", immediateRender: false, onUpdate: setZoom },
          0.83,
        );
        tl.fromTo(
          blankState,
          { mix: 1 },
          { mix: 0, duration: 0.05, ease: "power1.inOut", immediateRender: false, onUpdate: paintCan },
          0.85,
        );
        tl.to(
          frameState,
          {
            i: FRONT_FRAME,
            duration: 0.05,
            ease: "power1.inOut",
            immediateRender: false,
            onUpdate: paintCan,
          },
          0.9,
        );

        // [0.95 → 1.0] Waitlist phase: form fades in under the (now restored)
        // top-anchored front can. Held for the remainder of the pin so the user
        // has room to read + submit.
        tl.to(
          waitlistRef.current,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.04,
            ease: "power2.out",
            immediateRender: false,
          },
          0.95,
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
      </div>

      <div
        ref={stageRef}
        style={{
          position: "relative",
          width: "100%",
          /* 100dvh to match the body height: lets the pinned hero stage (and the
             can with its negative bottom positioning) extend fully beneath the
             Safari toolbar. */
          height: "100dvh",
          boxSizing: "border-box",
          // Transparent so the fixed Starfield (behind) shows through; the
          // parent <main> supplies the #000 base.
          background: "transparent",
        }}
      >
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
            transformOrigin: ZOOM_ORIGIN,
            width: "auto",
            aspectRatio: "2 / 3",
            pointerEvents: "none",
            zIndex: 2,
            willChange: "bottom, height, opacity, transform",
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
              scroll timeline swaps frames on it (smooth top-down → front → panel
              morph). object-fit:contain scales the source-resolution backing
              store into the stage box, exactly as the old <img> frames did. */}
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

          {/* Black overlay: fades in over the can (and its halo — hence the
              negative inset) to make the whole can "disappear" at the reveal,
              leaving the live text on black. Inside the can stage so it scales
              with the zoom and stays covering. */}
          <div
            ref={blackoutRef}
            aria-hidden
            style={{
              position: "absolute",
              inset: "-25%",
              background: "#000",
              opacity: 0,
              zIndex: 2,
              pointerEvents: "none",
              willChange: "opacity",
            }}
          />

        </div>

        {/* Live-text ingredients carousel — a full-viewport CLIPPED layer (above
            the can stage) whose inner stack of three 100vh slides is translated to
            pan ENERGY → DRIVE → FLOW, one centered block on screen at a time. It
            sits on the black left by the vanished can. Decoupled from the can stage
            so the text is its own transform — razor-sharp at full size. */}
        <div
          ref={panelRef}
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            opacity: 0,
            zIndex: 4,
            pointerEvents: "none",
            willChange: "opacity",
          }}
        >
          <div ref={panelInnerRef} style={{ willChange: "transform" }}>
            <MomentsPanel />
          </div>
        </div>

        {/* Waitlist phase — appears under the top-anchored front can after the
            panel reveal, positioned in the lower band. */}
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
            zIndex: 5,
            /* Safe-area padding at bottom so the form isn't hidden behind
               the Safari toolbar. Decorative low elements like the can can
               still bleed under. */
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
