"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { Can3D } from "./Can3D";
import { Reveal } from "./Reveal";
import { Waitlist, type WaitlistState } from "./Waitlist";

const CN: CSSProperties = { fontFamily: "var(--font-cn)", fontStyle: "normal" };
const MONO: CSSProperties = { fontFamily: "var(--font-mono)" };

const PAD = 56;
const CONTENT = "mx-auto w-full max-w-[480px]";

export function KineticPage() {
  const [scrollY, setScrollY] = useState(0);
  const [waitlist, setWaitlist] = useState<WaitlistState>({
    submitted: false,
    position: null,
  });

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onSubmitted = (position: number) =>
    setWaitlist({ submitted: true, position });

  const headerScrolled = scrollY > 30;

  return (
    <div style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          padding: "18px 20px 14px",
          background: headerScrolled ? "var(--background)" : "transparent",
          borderBottom: headerScrolled ? ".5px solid var(--hair)" : "none",
          transition: "background .2s, border-color .2s",
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
          <span
            style={{
              ...CN,
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1,
              letterSpacing: ".04em",
            }}
          >
            Beyond Opus
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
            {waitlist.submitted ? "● FILED" : "● COMING SOON"}
          </span>
        </div>
      </header>

      {/* HERO */}
      <section
        style={{
          position: "relative",
          minHeight: 780,
          padding: `${PAD / 2}px 20px ${PAD}px`,
          overflow: "hidden",
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
            transform: `translateY(${scrollY * -0.15}px)`,
          }}
        >
          <div
            style={{
              ...CN,
              fontWeight: 900,
              fontSize: 220,
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
            minHeight: 780 - PAD - PAD / 2,
          }}
        >
          <div
            style={{
              ...MONO,
              fontSize: 9,
              lineHeight: 1.6,
              letterSpacing: ".24em",
              color: "var(--dim)",
              textTransform: "uppercase",
              marginTop: 8,
            }}
          >
            ● 00 · Elevate — Q3 2026
          </div>

          <h1
            style={{
              ...CN,
              fontWeight: 900,
              marginTop: 14,
              marginBottom: 0,
              fontSize: "clamp(56px, 18vw, 84px)",
              lineHeight: 0.9,
              letterSpacing: ".005em",
              textWrap: "pretty" as CSSProperties["textWrap"],
            }}
          >
            Moments
            <br />
            <span style={{ color: "var(--accent)" }}>that matter.</span>
          </h1>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              minHeight: 280,
              marginTop: 12,
              transform: `translateY(${scrollY * -0.04}px)`,
            }}
          >
            <Can3D width={190} accent="var(--accent)" />
          </div>

          <p
            style={{
              ...MONO,
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--dim)",
              letterSpacing: ".01em",
              margin: "0 0 18px",
              maxWidth: 320,
            }}
          >
            Caffeine to climb. Nootropics to think. Adaptogens to land — no
            crash. Coming this fall.
          </p>

          <Waitlist state={waitlist} onSubmitted={onSubmitted} />
        </div>
      </section>

      {/* MARQUEE */}
      <section
        style={{
          borderTop: ".5px solid var(--hair)",
          borderBottom: ".5px solid var(--hair)",
          padding: "20px 0",
          overflow: "hidden",
        }}
      >
        <div className="km-marquee">
          {[0, 1].map((k) => (
            <div
              key={k}
              style={{
                ...CN,
                fontWeight: 700,
                display: "flex",
                gap: 18,
                paddingRight: 18,
                flexShrink: 0,
                fontSize: 42,
                lineHeight: 1,
                letterSpacing: ".02em",
                textTransform: "uppercase",
                alignItems: "center",
                whiteSpace: "nowrap",
              }}
            >
              <span>Climb.</span>
              <span style={{ color: "var(--dim)" }}>●</span>
              <span>Plateau.</span>
              <span style={{ color: "var(--dim)" }}>●</span>
              <span>Sustain.</span>
              <span style={{ color: "var(--dim)" }}>●</span>
              <span style={{ color: "var(--accent)" }}>Land.</span>
              <span style={{ color: "var(--dim)" }}>●</span>
            </div>
          ))}
        </div>
      </section>

      {/* THE STACK */}
      <section style={{ padding: `${PAD}px 20px` }}>
        <div className={CONTENT}>
          <Reveal>
            <div
              style={{
                ...MONO,
                fontSize: 10,
                lineHeight: 1,
                letterSpacing: ".3em",
                color: "var(--dim)",
                marginBottom: 14,
                textTransform: "uppercase",
              }}
            >
              ● 02 — The Stack
            </div>
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
          borderTop: ".5px solid var(--hair)",
        }}
      >
        <div className={CONTENT}>
          <Reveal>
            <div
              style={{
                ...MONO,
                fontSize: 10,
                lineHeight: 1,
                letterSpacing: ".3em",
                color: "var(--dim)",
                marginBottom: 14,
                textTransform: "uppercase",
              }}
            >
              ● 03 — Query
            </div>
            <h2
              style={{
                ...CN,
                fontWeight: 700,
                fontSize: "clamp(28px, 8vw, 38px)",
                lineHeight: 1,
                letterSpacing: ".005em",
                margin: 0,
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
          padding: `${PAD * 1.2}px 20px ${PAD}px`,
          borderTop: ".5px solid var(--hair)",
          textAlign: "center",
        }}
      >
        <div className={CONTENT}>
          <Reveal>
            <div
              style={{
                ...CN,
                fontWeight: 900,
                fontSize: "clamp(64px, 20vw, 100px)",
                lineHeight: 0.88,
                letterSpacing: ".01em",
                textWrap: "pretty" as CSSProperties["textWrap"],
                marginBottom: 28,
              }}
            >
              For the hours
              <br />
              <span style={{ color: "var(--accent)" }}>that count.</span>
            </div>
          </Reveal>
          <Waitlist state={waitlist} onSubmitted={onSubmitted} />
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          padding: "32px 20px 64px",
          borderTop: ".5px solid var(--hair)",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          lineHeight: 1.7,
          color: "var(--dim)",
          letterSpacing: ".05em",
        }}
      >
        <div className={CONTENT}>
          <div
            style={{
              ...CN,
              fontWeight: 700,
              fontSize: 16,
              lineHeight: 1,
              letterSpacing: ".04em",
              color: "var(--foreground)",
              marginBottom: 12,
            }}
          >
            Beyond Opus
          </div>
          <div>Brooklyn, NY · MMXXVI</div>
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 20,
              color: "var(--dim)",
              textTransform: "uppercase",
              letterSpacing: ".18em",
              fontSize: 9,
            }}
          >
            <span>Privacy</span>
            <span>Contact</span>
            <span>Instagram</span>
          </div>
        </div>
      </footer>
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
