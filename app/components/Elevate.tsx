"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useRef, useState } from "react";
import { Waitlist } from "./Waitlist";
import { CAN_FRAMES, FRAME_COUNT } from "../can-frames";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Homepage hero: a pinned, scroll-scrubbed can rotation painted to a single <canvas>.
// The can frames are built from the real green-screen sources. EVERYTHING the user
// sees — one steady clockwise rotation (front → FOR MOMENTS panel → nutrition/
// ingredients → blank can) and the finale where FOR MOMENTS THAT MATTER, then ENERGY,
// then DRIVE, then FLOW build on the blank can one at a time — is baked into the frames
// (public/can). There is NO CSS zoom and NO DOM text overlay: the page only scrubs
// frameState.i across CAN_FRAMES (see app/can-frames.ts).

// Hero rest pose (top-down can peeking from the bottom) → pinned pose (can centered).
const HERO_BOTTOM = "-54vh";
const HERO_HEIGHT = "110vh";
const PIN_BOTTOM = "16vh";
const PIN_HEIGHT = "68vh";
// End pose: as the waitlist fades in, the can lifts so the form sits fully in view
// (the centred pin pose would crowd the waitlist against the bottom edge).
const END_BOTTOM = "34vh";
// The can's VISUAL bottom in the end pose (container bottom 100−34=66vh, minus the
// contain-letterbox + frame headroom). The waitlist fills 100vh−this and centres the
// form in that gap. Tuned against the rendered can.
const CAN_END_VISUAL_BOTTOM = "58vh";

export function Elevate() {
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  const root = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const canStageRef = useRef<HTMLDivElement>(null);
  // The can sequence is CAN_FRAMES.length frames, loaded as off-DOM Image objects and
  // painted one at a time to a single <canvas> as scroll progresses. (Mounting all
  // frames as stacked <img> layers crashed iOS Safari's per-tab memory ceiling.)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backlightRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const waitlistRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        (window as unknown as { gsap: unknown }).gsap = gsap;
      }
      // Force scrollY 0 on every load so a refresh can't render the pinned timeline
      // mid-progress on first paint.
      if (typeof window !== "undefined") {
        if ("scrollRestoration" in window.history) {
          window.history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);
      }

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // iOS: freeze the pin-spacer recompute when the Safari toolbar resizes the
      // visual viewport, and normalize touch scrolling. No-ops on desktop.
      ScrollTrigger.config({ ignoreMobileResize: true });
      if (ScrollTrigger.isTouch === 1) {
        ScrollTrigger.normalizeScroll(true);
      }

      // 0) Frames load as off-DOM Image objects, painted one at a time (decoded-image
      // memory stays bounded by the browser cache). They're fetched PROGRESSIVELY — a
      // small low-priority window filled front-to-back — instead of firing all ~320
      // requests (≈16MB) at mount. The old all-at-once flood saturated the network on
      // first load, delaying the hero's first paint and starving the critical JS/fonts,
      // and it spiked decode memory (an iOS Safari risk). Scrub order is linear 0→last,
      // so front-to-back loading matches consumption order; the painter already falls
      // back to the nearest decoded frame if a fast scroll outruns the loader.
      const images = CAN_FRAMES.map(() => {
        const img = new Image();
        img.decoding = "async";
        return img;
      });
      imagesRef.current = images;

      const LOAD_WINDOW = 8; // max concurrent frame fetches
      let nextToLoad = 0;
      let inFlight = 0;
      const pumpLoads = () => {
        while (inFlight < LOAD_WINDOW && nextToLoad < images.length) {
          const idx = nextToLoad++;
          const img = images[idx];
          inFlight++;
          const onSettled = () => {
            inFlight--;
            pumpLoads();
          };
          img.addEventListener("load", onSettled, { once: true });
          img.addEventListener("error", onSettled, { once: true });
          // Frame 0 is also <link rel=preload> in <head>; everything after it is
          // background work that must yield to the critical JS/fonts/first frame.
          if ("fetchPriority" in img) {
            (img as HTMLImageElement & { fetchPriority: string }).fetchPriority =
              idx === 0 ? "high" : "low";
          }
          img.src = CAN_FRAMES[idx];
        }
      };
      pumpLoads();

      const isReady = (im?: HTMLImageElement) => !!im && im.complete && im.naturalWidth > 0;

      // Scroll-driven canvas state. The rotation tween scrubs `frameState.i`; the
      // painter draws whichever frame that lands on (forwards or backwards).
      const frameState = { i: 0 };

      let bufferSized = false;
      let lastPaint = -1;
      const paintCan = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const n = images.length;
        let i = Math.min(n - 1, Math.max(0, Math.round(frameState.i)));
        let img = images[i];
        // Fast scroll can outrun decode; fall back to the nearest decoded frame.
        if (!isReady(img)) {
          for (let d = 1; d < n; d++) {
            if (isReady(images[i - d])) { img = images[i - d]; i -= d; break; }
            if (isReady(images[i + d])) { img = images[i + d]; i += d; break; }
          }
        }
        if (!isReady(img)) return;
        if (!bufferSized) {
          // Backing store matches the stage box's 2:3 aspect (width-fit, centred):
          // identical on-screen geometry to a native buffer, with headroom for
          // object-fit:contain in the taller stage.
          canvas.width = img.naturalWidth;
          canvas.height = Math.round((img.naturalWidth * 3) / 2);
          bufferSized = true;
        }
        if (i === lastPaint) return;
        lastPaint = i;
        // Frames carry alpha (transparent background) — clear before each paint.
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          img,
          0,
          (canvas.height - img.naturalHeight) / 2,
          canvas.width,
          img.naturalHeight,
        );
      };

      // Paint the rest-pose frame as soon as it decodes (entry fades it in).
      if (isReady(images[0])) paintCan();
      else images[0].addEventListener("load", () => paintCan(), { once: true });

      // Handle to the entry timeline's logo fade-in; the scroll timeline's fade-out
      // kills it on first scroll so a fast scroll can't park the logo over the can.
      let logoEntryTween: gsap.core.Tween | null = null;

      // 1) Initial hero rest pose.
      gsap.set(canvasRef.current, { autoAlpha: 0 });
      gsap.set(backlightRef.current, { autoAlpha: 0 });
      gsap.set(logoRef.current, { autoAlpha: 0, y: 12 });
      gsap.set(canStageRef.current, { bottom: HERO_BOTTOM, height: HERO_HEIGHT, autoAlpha: 1 });
      gsap.set(waitlistRef.current, { autoAlpha: 0, y: 40 });

      // 2) Scroll timeline: rise + frame scrub + waitlist. No zoom, no overlay.
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
            onUpdate: (self) => {
              if (self.progress > 0.001 && logoEntryTween) {
                logoEntryTween.kill();
                logoEntryTween = null;
              }
              // At the very top, force the rest frame (a reload can briefly render
              // the timeline mid-way before settling back to progress 0).
              if (self.progress < 0.0006) {
                frameState.i = 0;
                paintCan();
              }
            },
          },
        });

        // Position-0 anchors so a reload that lands back on progress 0 repaints rest.
        tl.set(frameState, { i: 0 }, 0);
        tl.call(() => paintCan(), undefined, 0);

        // [0 → 0.06] Logo fades out.
        tl.fromTo(
          logoRef.current,
          { autoAlpha: 1, y: 0 },
          { autoAlpha: 0, duration: 0.06, immediateRender: false },
          0,
        );

        // [0.06 → 0.24] Rise: the can lifts + grows from the hero rest to centred.
        tl.fromTo(
          canStageRef.current,
          { bottom: HERO_BOTTOM, height: HERO_HEIGHT },
          { bottom: PIN_BOTTOM, height: PIN_HEIGHT, duration: 0.18, ease: "power2.inOut", immediateRender: false },
          0.06,
        );

        // [0.08 → 0.90] Scrub the whole baked sequence: rest → rise → front → FOR
        // MOMENTS panel → nutrition → blank → FOR MOMENTS + ENERGY/DRIVE/FLOW build
        // on one at a time (hero finale).
        tl.fromTo(
          frameState,
          { i: 0 },
          { i: FRAME_COUNT - 1, duration: 0.82, ease: "none", immediateRender: false, onUpdate: paintCan },
          0.08,
        );

        // [0.90 → 1.0] The can lifts to make room as the waitlist fades in beneath it
        // (the centred pin pose would crowd the form against the bottom edge).
        tl.to(
          canStageRef.current,
          { bottom: END_BOTTOM, duration: 0.08, ease: "power2.inOut", immediateRender: false },
          0.9,
        );

        // [0.92 → 1.0] Waitlist fades in under the (now lifted) can.
        tl.to(
          waitlistRef.current,
          { autoAlpha: 1, y: 0, duration: 0.05, ease: "power2.out", immediateRender: false },
          0.92,
        );

        ScrollTrigger.refresh();
      };

      buildScrollTl();

      // 3) Mount entrance: a short fade-in for the rest-pose can + logo.
      if (reduceMotion) {
        gsap.set([canvasRef.current, backlightRef.current], { autoAlpha: 1 });
        gsap.set(logoRef.current, { autoAlpha: 1, y: 0 });
      } else {
        const entry = gsap.timeline();
        entry.to(canvasRef.current, { autoAlpha: 1, duration: 0.7, ease: "power2.out" }, 0);
        entry.to(backlightRef.current, { autoAlpha: 1, duration: 1.1, ease: "power2.out" }, 0);
        logoEntryTween = gsap.to(logoRef.current, {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          paused: true,
        });
        entry.add(logoEntryTween.play(), 0.15);
        gsap.fromTo(
          backlightRef.current,
          { scale: 1 },
          { scale: 1.105, duration: 2, ease: "sine.inOut", repeat: -1, yoyo: true },
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
        overflowX: "hidden",
        overflowY: "visible",
      }}
    >
      <div
        ref={stageRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100dvh",
          boxSizing: "border-box",
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
            transform: "translate(-50%, -50%)",
            opacity: 0,
            zIndex: 3,
            pointerEvents: "none",
            willChange: "opacity, transform",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Opus Elevate"
            style={{
              display: "block",
              width: "min(480px, max(84vw, 290px))",
              height: "auto",
              userSelect: "none",
              pointerEvents: "none",
            }}
            draggable={false}
          />
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
          {/* Backlight halo behind the can. */}
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

          {/* Single canvas: the rest-pose frame is painted on mount, then the scroll
              timeline scrubs the baked sequence onto it. */}
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

        {/* Waitlist phase — waitlistRef spans the gap below the lifted can (its visual
            bottom → screen bottom); the inner wrapper is absolutely centred in that gap
            with translateY(-50%) (uses the form's real height, won't squish it like a
            flex column did). GSAP animates waitlistRef's opacity + y independently. */}
        <div
          ref={waitlistRef}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: CAN_END_VISUAL_BOTTOM,
            bottom: 0,
            opacity: 0,
            pointerEvents: "auto",
            willChange: "opacity, transform",
            zIndex: 5,
          }}
        >
          {/* Waitlist scales 0.8 from its TOP (shared component), so its 183px layout
              box has ~37px of empty space at the bottom; nudge down half of that so the
              VISIBLE card — not the layout box — is centred in the gap. */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              transform: "translateY(calc(-50% + 18px))",
              display: "flex",
              justifyContent: "center",
              padding: "0 24px",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
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
