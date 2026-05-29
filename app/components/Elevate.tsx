"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useRef, useState, type CSSProperties } from "react";
import { Waitlist, type WaitlistState } from "./Waitlist";
import { CAN_FRAMES } from "../can-frames";

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


export function Elevate() {
  const [waitlist, setWaitlist] = useState<WaitlistState>({
    submitted: false,
    position: null,
  });

  const root = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const canStageRef = useRef<HTMLDivElement>(null);
  // The can rotation is CAN_FRAMES.length frames sliced from the source clip,
  // ordered top-down rest pose (index 0) → straight-on front (last). frameRefs[0]
  // is the hero rest pose; the rest drive the scroll-driven rise crossfade,
  // morphing the camera angle smoothly across many small steps.
  const frameRefs = useRef<Array<HTMLImageElement | null>>([]);
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
      // 1) Set initial state: hero rest pose immediately. The rest-pose frame
      // (index 0) peeks from the bottom edge, logo centered, everything else
      // hidden. All frames start hidden; the entry timeline fades in frame 0.
      gsap.set(frameRefs.current, { autoAlpha: 0 });
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

        // [0.02 → 0.10] Logo fades out. fromTo with explicit FROM state +
        // immediateRender:false so (a) the entry fade-in isn't snapped
        // over at scroll TL creation, and (b) scrolling back to progress
        // 0 restores the logo (instead of leaving it at the tween's FROM
        // state captured mid-entry).
        tl.fromTo(
          logoRef.current,
          { autoAlpha: 1, y: 0 },
          { autoAlpha: 0, duration: 0.08, immediateRender: false },
          0.02,
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
        // Angle morph across the rise window: crossfade every adjacent frame
        // pair (topdown → … → front). With many frames each step is a tiny
        // camera-tilt delta, so the crossfade reads as a smooth perspective
        // shift rather than two ghost cans.
        const riseFrames = frameRefs.current;
        const xfadeStart = 0.12;
        const xfadeEnd = 0.30;
        const slot = (xfadeEnd - xfadeStart) / (riseFrames.length - 1);
        for (let i = 0; i < riseFrames.length - 1; i++) {
          const out = riseFrames[i];
          const next = riseFrames[i + 1];
          const t = xfadeStart + i * slot;
          tl.to(
            out,
            { autoAlpha: 0, duration: slot, immediateRender: false },
            t,
          );
          tl.to(
            next,
            { autoAlpha: 1, duration: slot, immediateRender: false },
            t,
          );
        }

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
      entry.to(frameRefs.current[0], { autoAlpha: 1, duration: 0.7, ease: "power2.out" }, 0);
      entry.to(
        logoRef.current,
        { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" },
        0.15,
      );
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
        overflow: "hidden",
      }}
    >
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
          {/* Frame 0 is the hero rest pose; the remaining frames drive the
              scroll-driven rise crossfade (smooth top-down → front morph). */}
          {CAN_FRAMES.map((src, i) => (
            <CanFrame
              key={src}
              src={src}
              innerRef={(el) => {
                frameRefs.current[i] = el;
              }}
            />
          ))}
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
            Be First.
          </h2>
          <div
            style={{
              marginTop: "clamp(14px, 2.2vh, 22px)",
              display: "inline-block",
              width: "min(380px, 80vw)",
              textAlign: "left",
            }}
          >
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

function CanFrame({
  src,
  innerRef,
  flipX,
}: {
  src: string;
  innerRef: React.Ref<HTMLImageElement>;
  flipX?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={innerRef}
      src={src}
      alt=""
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        userSelect: "none",
        pointerEvents: "none",
        transform: flipX ? "scaleX(-1)" : undefined,
        opacity: 0,
        willChange: "opacity",
      }}
      draggable={false}
    />
  );
}
