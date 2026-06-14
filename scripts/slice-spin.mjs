// Slices a greenscreen can-rotation clip into evenly-spaced, chroma-keyed
// transparent frames for the hero canvas (app/components/Elevate.tsx paints
// these on scroll). This is the committed, reproducible version of the
// previously ad-hoc pipeline that produced public/can/transparent-spin/ —
// extract frames with ffmpeg, then key each through the SAME green key as
// scripts/key-greenscreen.mjs (imported, so the algorithm can't drift).
//
// Frames are written frame-<base+i>.<format>, zero-padded to 2 digits, so the
// output drops straight into public/can/transparent-spin/. Use --base to APPEND
// a continuation onto the existing rotation (e.g. --base 100 to add the ⅓-turn
// panel reveal after the existing 100-frame spin) without disturbing 0..99.
//
// Usage:
//   node scripts/slice-spin.mjs <input.mp4> --out <dir> --count N \
//     [--from <srcFrame>] [--to <srcFrame>] [--base 0] \
//     [--skip-first] [--format avif|png] [--quality 60]
//
// --from/--to bound the source-frame window sampled (default: whole clip).
// --skip-first drops the first sampled frame (handy when the clip's frame 0
//   duplicates the last existing frame at an append seam).

import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keyRgbaInPlace } from "./key-greenscreen.mjs";

const argv = process.argv.slice(2);
const inputs = [];
const opt = { out: null, count: null, from: 0, to: null, base: 0, skipFirst: false, format: "avif", quality: 60 };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--out") opt.out = argv[++i];
  else if (a === "--count") opt.count = Number(argv[++i]);
  else if (a === "--from") opt.from = Number(argv[++i]);
  else if (a === "--to") opt.to = Number(argv[++i]);
  else if (a === "--base") opt.base = Number(argv[++i]);
  else if (a === "--skip-first") opt.skipFirst = true;
  else if (a === "--format") opt.format = argv[++i];
  else if (a === "--quality") opt.quality = Number(argv[++i]);
  else inputs.push(a);
}
if (inputs.length !== 1 || !opt.out || !opt.count) {
  console.error("usage: node scripts/slice-spin.mjs <input.mp4> --out <dir> --count N [--from F] [--to T] [--base B] [--skip-first] [--format avif|png] [--quality Q]");
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "slice-spin-"));
try {
  // 1) Explode the clip to PNGs once (src-0001.png …). Fast for short clips.
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", inputs[0], join(work, "src-%04d.png")], { stdio: "pipe" });
  const src = readdirSync(work).filter((f) => f.startsWith("src-")).sort();
  const total = src.length;
  const to = opt.to == null ? total - 1 : opt.to;
  const from = opt.from;

  // 2) Pick `count` source-frame indices evenly across [from, to].
  let picks = Array.from({ length: opt.count }, (_, i) =>
    Math.round(from + ((to - from) * i) / (opt.count - 1)),
  );
  if (opt.skipFirst) picks = picks.slice(1);

  mkdirSync(opt.out, { recursive: true });

  // 3) Key each picked frame and write frame-<base+i>.<format>.
  for (let i = 0; i < picks.length; i++) {
    const srcFile = join(work, `src-${String(picks[i] + 1).padStart(4, "0")}.png`);
    const { data, info } = await sharp(srcFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    keyRgbaInPlace(data);
    const idx = opt.base + i;
    const name = `frame-${String(idx).padStart(2, "0")}.${opt.format}`;
    let img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
    img = opt.format === "png" ? img.png() : img.avif({ quality: opt.quality, effort: 6 });
    await img.toFile(join(opt.out, name));
    console.log(`src#${picks[i]} -> ${name}`);
  }
  console.log(`wrote ${picks.length} frames to ${opt.out} (base ${opt.base})`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
