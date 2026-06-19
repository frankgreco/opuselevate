// Chroma-keys greenscreen can imagery to a transparent background — the
// committed rebuild of the ad-hoc pipeline that produced
// public/can/transparent-spin/ from assets/can/_source/can-spin-greenscreen-v2.mp4
// (the technique is described in app/can-frames.ts; the original script was
// never committed).
//
// Approach, per pixel (HSV):
//   1. Hue key: pixels whose hue falls in the green band are keyed out by
//      saturation — this kills the green-hued contact shadow regardless of
//      brightness (a luma key would either keep the shadow or eat the can).
//   2. Brightness gate: very bright, barely-saturated pixels are protected
//      even inside the green band, so the silver lid's highlights (which pick
//      up a faint green cast from the screen) never go transparent.
//   3. Despill: surviving pixels with green dominance get their green channel
//      pulled down to max(r, b), so rim pixels don't glow green over the
//      site's black background.
// Alpha ramps smoothly across the saturation window (soft edges, no halo).
//
// Usage:
//   node scripts/key-greenscreen.mjs <input.(png|avif|...)> [more inputs...]
//     [--out <dir>] [--format avif|png] [--quality N]
// Writes <input-stem>.<format> next to the input (or into --out).

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { pathToFileURL } from "node:url";

// Green band (degrees). The studio greenscreen sits ~100–150°; the band is
// wide so despill-tinted shadow pixels still fall inside it.
const HUE_MIN = 65;
const HUE_MAX = 180;
// Saturation ramp: alpha 1 → 0 as saturation rises from S_LOW to S_HIGH
// inside the green band. The can is black/white/silver (near-zero sat), so
// even a low floor never touches it.
const S_LOW = 0.12;
const S_HIGH = 0.3;
// Brightness gate: protect bright near-neutral pixels (silver lid) from the
// key even when their faint green cast lands them inside the band.
const V_PROTECT = 0.82;
const S_PROTECT = 0.22;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Chroma-key a raw RGBA buffer IN PLACE (same algorithm described above).
// Exported so the slice pipeline (scripts/slice-spin.mjs) can key extracted
// frames without re-implementing the key or shelling out per frame.
export function keyRgbaInPlace(data) {
  for (let p = 0; p < data.length; p += 4) {
    const r = data[p] / 255;
    const g = data[p + 1] / 255;
    const b = data[p + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    let h = 0;
    if (d > 0) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
      if (h < 0) h += 360;
    }

    const inBand = h >= HUE_MIN && h <= HUE_MAX;
    const protectedHighlight = v >= V_PROTECT && s <= S_PROTECT;
    if (inBand && !protectedHighlight) {
      const alpha = 1 - smoothstep(S_LOW, S_HIGH, s);
      data[p + 3] = Math.round(data[p + 3] * alpha);
    }
    // Despill any green-dominant survivor (incl. partially keyed edges).
    if (data[p + 3] > 0) {
      const cap = Math.max(data[p], data[p + 2]);
      if (data[p + 1] > cap) data[p + 1] = cap;
    }
  }
  return data;
}

// Key a single image file and write it (avif/png) to outDir (or alongside the
// input). Returns the written path.
export async function keyFile(input, { outDir = null, format = "avif", quality = 60 } = {}) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  keyRgbaInPlace(data);

  const stem = basename(input, extname(input));
  const dir = outDir ?? dirname(input);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${stem}.${format}`);
  let img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  img = format === "png" ? img.png() : img.avif({ quality, effort: 6 });
  await img.toFile(out);
  return out;
}

// CLI entry: key one or more files. (Guarded so importing this module for its
// exports doesn't run the CLI.)
async function main() {
  const args = process.argv.slice(2);
  const inputs = [];
  let outDir = null;
  let format = "avif";
  let quality = 60;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out") outDir = args[++i];
    else if (args[i] === "--format") format = args[++i];
    else if (args[i] === "--quality") quality = Number(args[++i]);
    else inputs.push(args[i]);
  }
  if (!inputs.length) {
    console.error("usage: node scripts/key-greenscreen.mjs <input...> [--out dir] [--format avif|png] [--quality N]");
    process.exit(1);
  }
  for (const input of inputs) {
    const out = await keyFile(input, { outDir, format, quality });
    console.log(`keyed ${input} -> ${out}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
