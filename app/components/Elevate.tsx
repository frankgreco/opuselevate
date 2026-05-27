"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useRef, useState, type CSSProperties } from "react";
import { Waitlist, type WaitlistState } from "./Waitlist";

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
const HERO_BOTTOM = "-65vh";
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
  // Front PNG drives rise endpoint + beats.
  const frontRef = useRef<HTMLImageElement>(null);
  const topdownRef = useRef<HTMLImageElement>(null);
  // Intermediate camera-tilt frames used only during the rise crossfade,
  // to morph the chrome lid smoothly between topdown (35°) and front (0°).
  // 7 frames total at ~5-7° steps for smooth perspective shift.
  const tilt28Ref = useRef<HTMLImageElement>(null);
  const tilt22Ref = useRef<HTMLImageElement>(null);
  const tilt16Ref = useRef<HTMLImageElement>(null);
  const tilt10Ref = useRef<HTMLImageElement>(null);
  const tilt5Ref = useRef<HTMLImageElement>(null);
  const beatRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]);
  const bloomRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]);
  const waitlistRef = useRef<HTMLDivElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);

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
      // 1) Set initial state: hero rest pose immediately. Topdown can
      // peeking from the bottom edge, logo centered, everything else hidden.
      gsap.set(
        [
          frontRef.current,
          tilt28Ref.current,
          tilt22Ref.current,
          tilt16Ref.current,
          tilt10Ref.current,
          tilt5Ref.current,
        ],
        { autoAlpha: 0 },
      );
      gsap.set(topdownRef.current, { autoAlpha: 0 });
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
      gsap.set(scrollCueRef.current, { autoAlpha: 0 });

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

        // [0.02 → 0.10] Logo + scroll cue fade out. fromTo with explicit
        // FROM state + immediateRender:false so (a) the entry fade-in
        // isn't snapped over at scroll TL creation, and (b) scrolling
        // back to progress 0 restores the logo + cue (instead of leaving
        // them at the tween's FROM state captured mid-entry).
        tl.fromTo(
          logoRef.current,
          { autoAlpha: 1, y: 0 },
          { autoAlpha: 0, duration: 0.08, immediateRender: false },
          0.02,
        );
        tl.fromTo(
          scrollCueRef.current,
          { autoAlpha: 0.5 },
          { autoAlpha: 0, duration: 0.05, immediateRender: false },
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
        // 7-frame angle morph across the rise window. Each transition
        // is ~5-7° of camera tilt — small enough that the crossfade
        // reads as a smooth perspective shift rather than two ghost cans.
        const riseFrames = [
          topdownRef, // 35°
          tilt28Ref,  // 28°
          tilt22Ref,  // 22°
          tilt16Ref,  // 16°
          tilt10Ref,  // 10°
          tilt5Ref,   // 5°
          frontRef,   // 0°
        ];
        const xfadeStart = 0.12;
        const xfadeEnd = 0.30;
        const slot = (xfadeEnd - xfadeStart) / (riseFrames.length - 1);
        for (let i = 0; i < riseFrames.length - 1; i++) {
          const out = riseFrames[i].current;
          const next = riseFrames[i + 1].current;
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

      // 4) Mount entrance: a short fade-in for the topdown can + logo +
      // scroll cue. No spin, no descent — the page starts at hero rest.
      const entry = gsap.timeline();
      entry.to(topdownRef.current, { autoAlpha: 1, duration: 0.7, ease: "power2.out" }, 0);
      entry.to(
        logoRef.current,
        { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" },
        0.15,
      );
      entry.to(
        scrollCueRef.current,
        { autoAlpha: 0.5, duration: 0.6, ease: "power2.out" },
        0.8,
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
        {/* Hue blooms */}
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
              background: `radial-gradient(70vh 55vh at 50% 22%, ${beat.hue}, transparent 65%)`,
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
          {/* Topdown is the hero rest pose. Front + 5 tilt frames drive
              the scroll-driven rise crossfade (smooth 35° → 0° morph). */}
          <CanFrame src="/can/angle-topdown.png" innerRef={topdownRef} />
          <CanFrame src="/can/angle-tilt28.png" innerRef={tilt28Ref} />
          <CanFrame src="/can/angle-tilt22.png" innerRef={tilt22Ref} />
          <CanFrame src="/can/angle-tilt16.png" innerRef={tilt16Ref} />
          <CanFrame src="/can/angle-tilt10.png" innerRef={tilt10Ref} />
          <CanFrame src="/can/angle-tilt5.png" innerRef={tilt5Ref} />
          <CanFrame src="/can/angle-front.png" innerRef={frontRef} />
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

        {/* Scroll cue */}
        <div
          ref={scrollCueRef}
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            ...MONO,
            fontSize: 9,
            letterSpacing: ".44em",
            color: "#fff",
            opacity: 0,
            pointerEvents: "none",
            zIndex: 3,
          }}
        >
          SCROLL
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
