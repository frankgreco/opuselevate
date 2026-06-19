// Homepage can-frame assembly from a SINGLE generated video (executive decision: the whole
// hero — rest/front → rotation through the printed faces → blank → FOR MOMENTS +
// ENERGY/DRIVE/FLOW building on one at a time — is one Seedance clip, no stitching).
// This keys the green clip frame-by-frame and samples it to the 240-frame manifest.
//
// Input:  assets/can/_work-v2/clips/seg-single.mp4 (chroma-green, 1248x1664)
// Output: public/can/transparent-spin/frame-NNN.avif  (+ _contactsheet.png)
//
// Usage: node scripts/assemble-single.mjs [--in <mp4>] [--out <dir>] [--count 240]
//        [--from <srcFrame>] [--to <srcFrame>]   (trim the source frame window)

import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keyRgbaInPlace } from "./key-greenscreen.mjs";

const argv = process.argv.slice(2);
const opt = { in: "assets/can/_work-v2/clips/seg-single.mp4", out: "public/can/transparent-spin", count: 240, quality: 58, from: 0, to: -1 };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--in") opt.in = argv[++i];
  else if (a === "--out") opt.out = argv[++i];
  else if (a === "--count") opt.count = Number(argv[++i]);
  else if (a === "--quality") opt.quality = Number(argv[++i]);
  else if (a === "--from") opt.from = Number(argv[++i]);
  else if (a === "--to") opt.to = Number(argv[++i]);
}

const W = 1248, H = 1664; // homepage canvas geometry (Elevate.tsx)

const work = mkdtempSync(join(tmpdir(), "v2-single-"));
try {
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", opt.in, join(work, "f-%04d.png")], { stdio: "pipe" });
  const all = readdirSync(work).filter((f) => /^f-\d+\.png$/.test(f)).sort().map((f) => join(work, f));
  const to = opt.to < 0 ? all.length - 1 : Math.min(opt.to, all.length - 1);
  const src = all.slice(opt.from, to + 1);
  if (src.length < 2) throw new Error(`only ${src.length} source frames in window`);

  mkdirSync(opt.out, { recursive: true });
  const idxs = Array.from({ length: opt.count }, (_, i) => Math.round((i * (src.length - 1)) / (opt.count - 1)));
  const previewIdx = new Set([0, 0.13, 0.25, 0.34, 0.5, 0.62, 0.74, 0.82, 0.9, 0.96, 1].map((p) => Math.round(p * (opt.count - 1))));
  const previewTiles = [];
  for (let i = 0; i < idxs.length; i++) {
    const { data } = await sharp(src[idxs[i]]).resize(W, H, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    keyRgbaInPlace(data);
    await sharp(data, { raw: { width: W, height: H, channels: 4 } }).avif({ quality: opt.quality, effort: 4 })
      .toFile(join(opt.out, `frame-${String(i).padStart(3, "0")}.avif`));
    if (previewIdx.has(i)) {
      const tile = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).resize(140, 187, { fit: "contain" }).png().toBuffer();
      previewTiles.push({ i, tile });
    }
  }
  const cell = 140, cols = previewTiles.length;
  const svg = Buffer.from(`<svg width="${cell * cols}" height="211"><rect width="100%" height="100%" fill="#000"/>${previewTiles.map((t, k) => `<text x="${k * cell + 6}" y="16" font-family="monospace" font-size="12" fill="#fff">f${t.i}</text>`).join("")}</svg>`);
  await sharp(svg).composite(previewTiles.map((t, k) => ({ input: t.tile, left: k * cell, top: 24 }))).png().toFile(join(opt.out, "_contactsheet.png"));
  console.log(`wrote ${opt.count} frames (from ${src.length} source frames ${opt.from}..${to}) to ${opt.out}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
