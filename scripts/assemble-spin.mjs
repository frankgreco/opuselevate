// Assembles the homepage can-rotation frame set from the three Seedance turntable
// segments (front→panel, panel→back, back→front) into the SAME 146-frame layout
// as the original (app/can-frames.ts): frames 0–99 are a full 360° (front →
// PANEL → back → front, so the ENERGY/DRIVE/FLOW panel is now visible DURING the
// first rotation, ~frame 33), frames 100–145 continue a ⅓ turn front → panel for
// the settle/reveal. Each frame is chroma-keyed through the SAME green key as the
// rest of the pipeline (scripts/key-greenscreen.mjs), so the can composites on the
// site's black with clean edges.
//
// Inputs: full-res PNG frames pre-extracted from the segment clips into
//   <work>/full-front-panel, full-panel-back, full-back-front  (f-001.png …).
// Output: <out>/frame-00.avif … frame-145.avif  (+ a keyed-on-black contact sheet
//   at <out>/_contactsheet.png for review).
//
// Usage: node scripts/assemble-spin.mjs --work /tmp --out assets/can/_work-v2/staged-frames

import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { keyRgbaInPlace } from "./key-greenscreen.mjs";

const argv = process.argv.slice(2);
const opt = { work: "/tmp", out: "assets/can/_work-v2/staged-frames", quality: 60 };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--work") opt.work = argv[++i];
  else if (argv[i] === "--out") opt.out = argv[++i];
  else if (argv[i] === "--quality") opt.quality = Number(argv[++i]);
}

const seg = (name) => {
  const dir = join(opt.work, `full-${name}`);
  const files = readdirSync(dir).filter((f) => /^f-\d+\.png$/.test(f)).sort();
  return files.map((f) => join(dir, f));
};
const s0 = seg("rise"); //        top-down rest → front (the rising intro)
const s1 = seg("front-panel"); // front → panel
const s2 = seg("panel-back"); //  panel → back
const s3 = seg("back-front"); //  back  → front

// Ordered source list, seam-duplicates dropped (each segment's shared keyframe
// endpoint appears once). See header for the resulting face order.
const firstRotation = [
  ...s0.slice(0, 96), //  top-down → near-front     (idx 0   = top-down REST)
  ...s1.slice(0, 96), //  front → near-panel        (idx 96  = front)
  ...s2.slice(0, 96), //  panel → near-back         (idx 192 = PANEL — seen mid first rotation)
  ...s3.slice(0, 97), //  back  → front             (idx 288 = back, 384 = front)
]; // 385 frames: rest → front → panel → back → front (rise + full 360°)
const settle = s1.slice(1, 97); // front → panel (skip dup front), 96 frames, ends on panel

// Sample into the 146-frame layout: 0–99 from the 360°, 100–145 from the settle.
const sampleEven = (arr, count) =>
  Array.from({ length: count }, (_, i) =>
    arr[Math.round((i * (arr.length - 1)) / (count - 1))],
  );
const picked = [
  ...sampleEven(firstRotation, 100), // frames 0–99  (FRONT_FRAME = 99)
  ...sampleEven(settle, 46), //          frames 100–145 (PANEL_FRAME = 145)
];

mkdirSync(opt.out, { recursive: true });
const previewTiles = [];
const previewIdx = [0, 12, 25, 37, 49, 62, 74, 99, 112, 124, 145];
for (let i = 0; i < picked.length; i++) {
  const { data, info } = await sharp(picked[i]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  keyRgbaInPlace(data);
  const img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  const name = `frame-${String(i).padStart(2, "0")}.avif`;
  await img.avif({ quality: opt.quality, effort: 4 }).toFile(join(opt.out, name));
  if (previewIdx.includes(i)) {
    const tile = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .resize(150, 200, { fit: "contain" }).png().toBuffer();
    previewTiles.push({ i, tile });
  }
}

// Keyed-on-black contact sheet for review.
const cell = 150, cellH = 200, cols = previewTiles.length;
const W = cell * cols, H = cellH + 24;
const labels = previewTiles.map((t, k) => `<text x="${k * cell + 6}" y="16" font-family="monospace" font-size="13" fill="#fff">f${t.i}</text>`).join("");
const svg = Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/>${labels}</svg>`);
await sharp(svg)
  .composite(previewTiles.map((t, k) => ({ input: t.tile, left: k * cell, top: 24 })))
  .png()
  .toFile(join(opt.out, "_contactsheet.png"));

console.log(`wrote ${picked.length} keyed frames to ${opt.out} (+ _contactsheet.png)`);
