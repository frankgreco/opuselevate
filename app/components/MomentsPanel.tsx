// Live-text version of the can's ENERGY/DRIVE/FLOW ingredients — three full-screen
// "slides", one per phase, each CENTERED (icon + name + ingredients). The reveal
// pans one slide at a time (ENERGY → DRIVE → FLOW), so only one block is ever on
// screen. No "FOR MOMENTS THAT MATTER" tagline. Driven by app/stack.ts so it can't
// drift; typography mirrors scripts/render-label.mjs (Courier ingredients,
// Helvetica Neue mode names) but sized to the viewport for the full-screen read.
//
// Why DOM text (not the rendered raster or the AI-printed text): the panel must be
// razor-sharp at full size — real text re-rasterizes crisp, a raster doesn't.
// Elevate stacks these slides in a clipped, full-viewport layer and translates it
// vertically to pan between them.

import { STACK, type StackPhase } from "../stack";

// Soft brand white — slightly off pure white so it reads like the can's printed
// silver-white, not a harsh #fff.
const PANEL_FG = "#ededed";
const MONO = 'Courier, "Courier New", monospace';
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

// On-label display name: drop the "L-" prefix, join hyphenated names with a space
// (L-Tyrosine -> TYROSINE, Alpha-GPC -> ALPHA GPC) — matches render-label.mjs.
const labelName = (name: string) =>
  name.replace(/^L-/i, "").replace(/-/g, " ").toUpperCase();

// Mode icons, traced from the approved art (viewBox 0 0 100 100, filled).
function Icon({ name, size }: { name: string; size: string }) {
  const common = { width: size, height: size, viewBox: "0 0 100 100", "aria-hidden": true, style: { display: "block" } } as const;
  if (name === "Energy") {
    return (
      <svg {...common}>
        <g fill={PANEL_FG}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const r = deg % 90 === 0 ? 48 : 38; // long cardinal rays, shorter diagonals
            return (
              <path key={deg} transform={`rotate(${deg} 50 50)`} d={`M50 50 L43.2 ${50 - r * 0.36} L50 ${50 - r} L56.8 ${50 - r * 0.36} Z`} />
            );
          })}
          <circle cx="50" cy="50" r="6" />
        </g>
      </svg>
    );
  }
  if (name === "Drive") {
    return (
      <svg {...common}>
        <g fill={PANEL_FG}>
          <path d="M24 27 Q24 21 29 24 L59 46.5 Q63 50 59 53.5 L29 76 Q24 79 24 73 Z" />
          <path d="M54 27 Q54 21 59 24 L89 46.5 Q93 50 89 53.5 L59 76 Q54 79 54 73 Z" />
        </g>
      </svg>
    );
  }
  return (
    <svg {...common}>
      <g fill={PANEL_FG}>
        <path transform="rotate(-8 16 88)" d="M16 88 Q4 76 4 60 Q4 46 16 46 Q28 46 28 60 Q28 76 16 88 Z" />
        <path d="M50 88 Q38 74 38 44 Q38 22 50 22 Q62 22 62 44 Q62 74 50 88 Z" />
        <path transform="rotate(8 84 88)" d="M84 88 Q72 76 72 60 Q72 46 84 46 Q96 46 96 60 Q96 76 84 88 Z" />
      </g>
    </svg>
  );
}

const ICON_SIZE: Record<string, string> = {
  Energy: "clamp(54px, 11vw, 118px)",
  Drive: "clamp(46px, 9.4vw, 102px)",
  Flow: "clamp(44px, 9vw, 98px)",
};

function Slide({ phase }: { phase: StackPhase }) {
  return (
    <section
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 6vw",
        boxSizing: "border-box",
      }}
    >
      <Icon name={phase.name} size={ICON_SIZE[phase.name] ?? "clamp(46px, 9.4vw, 102px)"} />
      <h2
        style={{
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: "clamp(40px, 7vw, 86px)",
          letterSpacing: "0.12em",
          marginRight: "-0.12em",
          marginTop: "clamp(22px, 4.4vw, 54px)",
          color: PANEL_FG,
        }}
      >
        {phase.name.toUpperCase()}
      </h2>
      <ul style={{ listStyle: "none", marginTop: "clamp(18px, 3.4vw, 42px)" }}>
        {phase.ings.map((i) => (
          <li
            key={i.name}
            style={{
              fontFamily: MONO,
              fontWeight: 400,
              fontSize: "clamp(16px, 2.7vw, 34px)",
              letterSpacing: "0.10em",
              marginRight: "-0.10em",
              lineHeight: 2.4,
              whiteSpace: "nowrap",
              color: PANEL_FG,
            }}
          >
            {labelName(i.name)}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Three stacked full-viewport slides (total 300vh). The caller clips to one
// viewport and translates this vertically to show one phase at a time.
export function MomentsPanel() {
  return (
    <div style={{ WebkitFontSmoothing: "antialiased", userSelect: "none" }}>
      {STACK.map((phase) => (
        <Slide key={phase.tag} phase={phase} />
      ))}
    </div>
  );
}
