"use client";

import Image from "next/image";
import { type CSSProperties, useState } from "react";
import { LogoMarquee } from "./LogoMarquee";
import { Reveal } from "./Reveal";
import { Waitlist, type WaitlistState } from "./Waitlist";

const CN: CSSProperties = { fontFamily: "var(--font-cn)", fontStyle: "normal" };
const MONO: CSSProperties = { fontFamily: "var(--font-mono)" };

const PAD = 48;
const CONTENT = "mx-auto w-full max-w-[480px]";

export function KineticPage() {
  const [waitlist, setWaitlist] = useState<WaitlistState>({
    submitted: false,
    position: null,
  });

  const onSubmitted = (position: number) =>
    setWaitlist({ submitted: true, position });

  return (
    <div style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          padding: "18px 20px 14px",
        }}
      >
        <div
          className={CONTENT}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Image
            src="/logo.svg"
            alt="Beyond Opus"
            width={340}
            height={128}
            style={{ display: "block", height: 28, width: "auto" }}
          />
          <span className="sr-only">Beyond Opus</span>
          {waitlist.submitted ? (
            <span
              style={{
                ...MONO,
                fontSize: 9,
                lineHeight: 1,
                letterSpacing: ".24em",
                color: "var(--dim)",
              }}
            >
              ● FILED
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("waitlist-email-hero");
                if (!el) return;
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                (el as HTMLInputElement).focus({ preventScroll: true });
              }}
              style={{
                ...MONO,
                background: "var(--foreground)",
                color: "var(--background)",
                border: "none",
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: 9,
                lineHeight: 1,
                letterSpacing: ".24em",
                textTransform: "uppercase",
                borderRadius: 0,
              }}
            >
              Join
            </button>
          )}
        </div>
      </header>

      {/* HERO */}
      <section
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          padding: `${PAD / 2}px 20px ${PAD}px`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              ...CN,
              fontWeight: 900,
              fontSize: "clamp(84px, 28vw, 220px)",
              lineHeight: 0.85,
              letterSpacing: ".02em",
              color: "rgba(246,244,239,.05)",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            ELEVATE
          </div>
        </div>

        <div
          className={CONTENT}
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            width: "100%",
          }}
        >
          <h1
            className="max-w-[11ch]"
            style={{
              ...CN,
              fontWeight: 900,
              marginTop: 14,
              marginBottom: 0,
              fontSize: "clamp(48px, 15vw, 72px)",
              lineHeight: 0.9,
              letterSpacing: ".005em",
            }}
          >
            <span>For moments that matter.</span>
          </h1>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              minHeight: 0,
              marginTop: 0,
            }}
          >
            <Image
              src="/can.png"
              alt="Elevate can"
              width={768}
              height={1360}
              preload
              style={{
                width: "auto",
                height: "100%",
                maxHeight: "100%",
                maxWidth: "clamp(240px, 32vw, 460px)",
                objectFit: "contain",
                display: "block",
                userSelect: "none",
                pointerEvents: "none",
              }}
              draggable={false}
            />
          </div>

          <Waitlist
            state={waitlist}
            onSubmitted={onSubmitted}
            inputId="waitlist-email-hero"
          />
        </div>
      </section>
      </div>

      {/* MARQUEE */}
      <LogoMarquee />

      {/* THE STACK */}
      <section style={{ padding: `${PAD}px 20px` }}>
        <div className={CONTENT}>
          <Reveal>
            <h2
              style={{
                ...CN,
                fontWeight: 900,
                fontSize: "clamp(38px, 11vw, 56px)",
                lineHeight: 0.95,
                letterSpacing: ".005em",
                margin: 0,
                textWrap: "pretty" as CSSProperties["textWrap"],
              }}
            >
              Three vectors,
              <br />
              one <span style={{ color: "var(--accent)" }}>curve</span>.
            </h2>
          </Reveal>

          <div
            style={{
              marginTop: 28,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {STACK.map((c) => (
              <Reveal
                key={c.tag}
                style={{
                  padding: 22,
                  border: ".5px solid var(--hair)",
                  borderRadius: 4,
                  background: "rgba(255,255,255,.02)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    ...CN,
                    fontWeight: 900,
                    position: "absolute",
                    right: -8,
                    bottom: -28,
                    pointerEvents: "none",
                    fontSize: 140,
                    lineHeight: 1,
                    letterSpacing: ".02em",
                    color: "rgba(246,244,239,.05)",
                  }}
                >
                  {c.tag}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      ...MONO,
                      fontSize: 9,
                      lineHeight: 1,
                      letterSpacing: ".24em",
                      color: c.hue,
                    }}
                  >
                    ● {c.range}
                  </span>
                  <span
                    style={{
                      ...MONO,
                      fontSize: 9,
                      lineHeight: 1,
                      letterSpacing: ".24em",
                      color: "var(--dim)",
                    }}
                  >
                    0{c.tag.slice(1)} / 03
                  </span>
                </div>
                <h3
                  style={{
                    ...CN,
                    fontWeight: 900,
                    position: "relative",
                    marginTop: 14,
                    marginBottom: 18,
                    fontSize: 44,
                    lineHeight: 0.95,
                    letterSpacing: ".01em",
                  }}
                >
                  {c.name}.
                </h3>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {c.ings.map((i) => {
                    const [name, mg] = i.split(/ (?=\d)/);
                    return (
                      <div
                        key={i}
                        style={{
                          ...MONO,
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          lineHeight: 1.3,
                          letterSpacing: ".04em",
                        }}
                      >
                        <span style={{ color: "var(--foreground)" }}>{name}</span>
                        <span style={{ color: "var(--accent)" }}>{mg} mg</span>
                      </div>
                    );
                  })}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        style={{
          padding: `${PAD}px 20px`,
        }}
      >
        <div className={CONTENT}>
          <Reveal>
            <h2
              style={{
                ...CN,
                fontWeight: 900,
                fontSize: "clamp(38px, 11vw, 56px)",
                lineHeight: 0.95,
                letterSpacing: ".005em",
                margin: 0,
                textWrap: "pretty" as CSSProperties["textWrap"],
              }}
            >
              The fine print.
            </h2>
          </Reveal>
          <div style={{ marginTop: 18 }}>
            {FAQ.map(([q, a]) => (
              <details
                key={q}
                className="km-faq"
                style={{
                  borderTop: ".5px solid var(--hair)",
                  padding: "18px 0",
                }}
              >
                <summary
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      ...CN,
                      fontWeight: 700,
                      fontSize: 17,
                      lineHeight: 1.3,
                      letterSpacing: ".005em",
                    }}
                  >
                    {q}
                  </span>
                  <span
                    className="km-plus"
                    style={{
                      ...MONO,
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: ".5px solid var(--hair)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      lineHeight: 1,
                      color: "var(--dim)",
                      transition: "transform .25s",
                      flex: "0 0 auto",
                    }}
                  >
                    +
                  </span>
                </summary>
                <p
                  style={{
                    marginTop: 10,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: "var(--dim)",
                  }}
                >
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* OUTRO */}
      <section
        style={{
          padding: `${PAD}px 20px ${PAD}px`,
          textAlign: "center",
        }}
      >
        <div className={CONTENT}>
          <Reveal>
            <p
              style={{
                ...MONO,
                fontSize: 13,
                lineHeight: 1.55,
                color: "var(--dim)",
                letterSpacing: ".01em",
                margin: "0 auto 28px",
                maxWidth: 320,
              }}
            >
              Caffeine to climb. Nootropics to think. Adaptogens to land — no
              crash. Coming this fall.
            </p>
          </Reveal>
          <Waitlist state={waitlist} onSubmitted={onSubmitted} />
        </div>
      </section>
    </div>
  );
}

const STACK = [
  {
    tag: "01",
    name: "Energy",
    range: "0–20 MIN",
    ings: ["Caffeine 180", "Taurine 750", "ALCAR 500"],
    hue: "#d97a4a",
  },
  {
    tag: "02",
    name: "Drive",
    range: "30–120 MIN",
    ings: ["L-Tyrosine 500", "Rhodiola 300"],
    hue: "#a8843e",
  },
  {
    tag: "03",
    name: "Flow",
    range: "60–240 MIN",
    ings: ["L-Theanine 200", "Alpha-GPC 300"],
    hue: "#5a8a9e",
  },
] as const;

const FAQ: ReadonlyArray<readonly [string, string]> = [
  [
    "When does it ship?",
    "Q3 2026. Waitlist members get first allocation — and a launch discount.",
  ],
  [
    "Caffeine?",
    "180 mg, split 60/40 anhydrous and guarana. Climb is staggered, not spiked.",
  ],
  ["Will I crash?", "No. Adaptogens carry the landing through hour four."],
  [
    "Where will it ship?",
    "CONUS, UK, EU at launch. 48h dispatch. Carbon-neutral.",
  ],
];
