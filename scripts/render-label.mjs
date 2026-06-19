// Renders the can's "moments" side-panel label (FOR MOMENTS THAT MATTER. +
// ENERGY/DRIVE/FLOW blocks) to a high-res PNG, replacing the hand-made
// assets/can/labels/panel-moments.png (454×1090, too small to zoom into and
// not regenerable). Phase names + ingredient lists come from app/stack.ts —
// the same single source of truth as the hero beats and /llms.txt — so the
// label can never drift from the site copy or carry a typo.
//
// The output is (a) the reference art fed to Higgsfield when generating the
// can-with-side-panel imagery and (b) a crisp zoom target candidate for the
// in-browser beat zoom. Typography matches the stakeholder-approved art, NOT
// the site fonts: Courier-style mono for tagline/ingredients, plain (not
// condensed) Helvetica Neue for the mode names. Both are macOS system fonts,
// which is why this renders via local headless Chrome with no @font-face.
//
// Usage: node --experimental-strip-types scripts/render-label.mjs
// Output: assets/can/labels/panel-moments-v2.png (908×2180 CSS px @2x = 1816×4360)

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { STACK } from "../app/stack.ts";

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// CLI flags (optional): --out <path> overrides the output PNG; --no-tagline drops
// the "FOR MOMENTS THAT MATTER." header. The /v2 can has no tagline (it reveals one
// phase at a time at the settle), so its reference art is rendered with --no-tagline.
const argv = process.argv.slice(2);
const outArg = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : null;
const NO_TAGLINE = argv.includes("--no-tagline");
const OUT = outArg
  ? resolve(process.cwd(), outArg)
  : resolve(import.meta.dirname, "../assets/can/labels/panel-moments-v2.png");

// Art canvas: same 454:1090 aspect as the approved panel art, at 2× CSS px
// (and 2× device scale below, so the PNG lands at 4× the original).
const W = 908;
const H = 2180;

// On-label display name: the approved art drops the "L-" prefix and joins
// hyphenated names with a space (L-Tyrosine → TYROSINE, Alpha-GPC → ALPHA GPC).
const labelName = (name) =>
  name.replace(/^L-/i, "").replace(/-/g, " ").toUpperCase();

// Mode icons, traced from the approved art (viewBox 0 0 100 100, filled white):
// an 8-ray starburst (ENERGY), a rounded fast-forward » (DRIVE), and a
// three-petal fan (FLOW).
const ICONS = {
  Energy: `<svg viewBox="0 0 100 100" width="112" height="112"><g fill="#fff">
    ${[0, 45, 90, 135, 180, 225, 270, 315]
      .map((deg) => {
        const r = deg % 90 === 0 ? 48 : 38; // long cardinal rays, shorter diagonals
        return `<path transform="rotate(${deg} 50 50)" d="M50 50 L43.2 ${50 - r * 0.36} L50 ${50 - r} L56.8 ${50 - r * 0.36} Z"/>`;
      })
      .join("")}
    <circle cx="50" cy="50" r="6"/>
  </g></svg>`,
  Drive: `<svg viewBox="0 0 100 100" width="100" height="100"><g fill="#fff">
    <path d="M24 27 Q24 21 29 24 L59 46.5 Q63 50 59 53.5 L29 76 Q24 79 24 73 Z"/>
    <path d="M54 27 Q54 21 59 24 L89 46.5 Q93 50 89 53.5 L59 76 Q54 79 54 73 Z"/>
  </g></svg>`,
  Flow: `<svg viewBox="0 0 100 100" width="96" height="96"><g fill="#fff">
    <path transform="rotate(-8 16 88)" d="M16 88 Q4 76 4 60 Q4 46 16 46 Q28 46 28 60 Q28 76 16 88 Z"/>
    <path d="M50 88 Q38 74 38 44 Q38 22 50 22 Q62 22 62 44 Q62 74 50 88 Z"/>
    <path transform="rotate(8 84 88)" d="M84 88 Q72 76 72 60 Q72 46 84 46 Q96 46 96 60 Q96 76 84 88 Z"/>
  </g></svg>`,
};

const block = (phase) => `
  <section>
    <div class="icon">${ICONS[phase.name] ?? ""}</div>
    <h2>${phase.name.toUpperCase()}</h2>
    <ul>
      ${phase.ings.map((i) => `<li>${labelName(i.name)}</li>`).join("\n      ")}
    </ul>
  </section>`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; }
  body {
    width: ${W}px; height: ${H}px;
    background: #131313; /* can-black, matches the approved art */
    color: #fff;
    display: flex; flex-direction: column; align-items: center;
    -webkit-font-smoothing: antialiased;
  }
  .tagline {
    /* Courier (PostScript) over Courier New: the approved art's mono has the
       heavier slab strokes of classic Courier, not Courier New's hairlines. */
    font-family: Courier, "Courier New", monospace;
    font-weight: 400;
    font-size: 42px;
    letter-spacing: 0.16em;
    margin-right: -0.16em;
    margin-top: 86px;
    white-space: nowrap;
  }
  section { display: flex; flex-direction: column; align-items: center; }
  /* Vertical rhythm follows the approved art: roomy gaps between the first
     two blocks, FLOW tucked tighter so ALPHA GPC lands flush with the
     bottom edge (same as the art). */
  section:nth-of-type(1) { margin-top: 218px; }
  section:nth-of-type(2) { margin-top: 200px; }
  section:nth-of-type(3) { margin-top: 90px; }
  h2 {
    font-family: "Helvetica Neue", Helvetica, sans-serif;
    font-weight: 500;
    font-size: 44px;
    letter-spacing: 0.12em;
    margin-top: 72px;
    /* recentre the letter-spacing tail so the word sits optically centered */
    margin-right: -0.12em;
  }
  ul { list-style: none; margin-top: 32px; text-align: center; }
  li {
    font-family: Courier, "Courier New", monospace;
    font-weight: 400;
    font-size: 42px;
    letter-spacing: 0.10em;
    margin-right: -0.10em;
    line-height: 2.6;
    white-space: nowrap;
  }
</style></head>
<body>
  <!-- When --no-tagline, the tagline is hidden but KEEPS its box, so the ENERGY/
       DRIVE/FLOW blocks stay in their exact full-panel positions (no reflow up).
       This matches the /v2 end reveal: tagline gone, phases in the same spots. -->
  <div class="tagline"${NO_TAGLINE ? ' style="visibility:hidden"' : ""}>FOR MOMENTS THAT MATTER.</div>
  ${STACK.map(block).join("\n")}
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), "opus-label-"));
const page = join(dir, "label.html");
writeFileSync(page, html);
try {
  execFileSync(CHROME, [
    "--headless",
    `--screenshot=${OUT}`,
    `--window-size=${W},${H}`,
    "--force-device-scale-factor=2",
    "--hide-scrollbars",
    "--virtual-time-budget=2000",
    `file://${page}`,
  ], { stdio: "pipe" });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`wrote ${OUT}`);
