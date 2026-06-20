// Final homepage can-frame assembly — built from the EXACT homepage can.
// NO float; ONE clockwise rotation in three even thirds, then loop. The
// page just scrubs these frames:
//   rest → rise → front (opvs) → 120° → nutrition → 120° → blank FOR-MOMENTS face →
//   [FOR MOMENTS THAT MATTER → ENERGY → DRIVE → FLOW build one at a time] → 120° → front
//
// Pieces (all keyed via key-greenscreen, SCALE-NORMALIZED to a common can height so
// seams don't jitter; a couple of frames trimmed at internal glues, long static holds
// dropped):
//   • clips/tween1-rest-front.mp4        rest → front (rise)
//   • clips/tween-front-nutrition.mp4    front → nutrition (120° CW)
//   • clips/tween-nutrition-blank.mp4    nutrition → blank FOR-MOMENTS face (120° CW)
//   • build: text composited ONTO the exact frame the spin landed on (baseA) — blank →
//     +header → +ENERGY → +DRIVE — then the FLOW reveal dissolves straight into:
//   • clips/tween-build-front.mp4        FOR MOMENTS panel → front (120° CW)
// Building on baseA + dissolving into the loop-back clip avoids a still↔clip flicker.
// Dissolves are premultiplied-alpha (keyed buffers keep green RGB at alpha 0).
//
// Usage: node scripts/assemble-final.mjs [--out <dir>] [--count 240] [--seam-head 1] [--seam-tail 1]

import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keyRgbaInPlace } from "./key-greenscreen.mjs";

const argv = process.argv.slice(2);
const opt = { out: "public/can/transparent-spin", count: 240, quality: 58, seamHead: 1, seamTail: 1, outWidth: 0 };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--out") opt.out = argv[++i];
  else if (argv[i] === "--count") opt.count = Number(argv[++i]);
  else if (argv[i] === "--quality") opt.quality = Number(argv[++i]);
  else if (argv[i] === "--seam-head") opt.seamHead = Number(argv[++i]);
  else if (argv[i] === "--seam-tail") opt.seamTail = Number(argv[++i]);
  else if (argv[i] === "--out-width") opt.outWidth = Number(argv[++i]); // downscale at encode only
}

const W = 1248, H = 1664;
const G = "assets/can/_work-v2";
const preClips = [`${G}/clips/tween1-rest-front.mp4`, `${G}/clips/tween-front-nutrition.mp4`, `${G}/clips/tween-nutrition-blank.mp4`];
const cleanStills = ["panel-s0", "panel-s1", "panel-s2", "panel-s3"].map((s) => `${G}/glossy/${s}.png`);
const postClip = `${G}/clips/tween-build-front.mp4`;

const work = mkdtempSync(join(tmpdir(), "v2final-"));
try {
  const keyRaw = async (file) => { const { data } = await sharp(file).resize(W, H, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); keyRgbaInPlace(data); return data; };
  const bboxOf = (buf) => { let mnY = H, mxY = 0, mnX = W, mxX = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (buf[(y*W+x)*4+3] > 60) { if(y<mnY)mnY=y; if(y>mxY)mxY=y; if(x<mnX)mnX=x; if(x>mxX)mxX=x; } } return { top: mnY, h: mxY - mnY }; };
  let TARGET_H, TARGET_TOP;
  const normalize = async (buf, s, topClip) => {
    const sw = Math.max(1, Math.round(W * s)), sh = Math.max(1, Math.round(H * s));
    const scaled = sharp(buf, { raw: { width: W, height: H, channels: 4 } }).resize(sw, sh);
    if (sw >= W && sh >= H) {
      const left = Math.min(sw - W, Math.max(0, Math.round((sw - W) / 2)));
      const top = Math.min(sh - H, Math.max(0, Math.round(topClip * s - TARGET_TOP)));
      const { data } = await scaled.extract({ left, top, width: W, height: H }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return data;
    }
    const offX = Math.max(0, Math.round((W - sw) / 2));
    const offY = Math.max(0, Math.min(H - sh, Math.round(TARGET_TOP - topClip * s)));
    const sbuf = await scaled.png().toBuffer();
    const { data } = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: sbuf, left: offX, top: offY }]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return data;
  };
  const blend = (a, b, t) => { const o = Buffer.allocUnsafe(a.length); for (let i = 0; i < a.length; i += 4) { const aw = (a[i+3]/255)*(1-t), bw=(b[i+3]/255)*t, oa=aw+bw; if(oa<=0){o[i]=o[i+1]=o[i+2]=o[i+3]=0;continue;} o[i]=Math.round((a[i]*aw+b[i]*bw)/oa);o[i+1]=Math.round((a[i+1]*aw+b[i+1]*bw)/oa);o[i+2]=Math.round((a[i+2]*aw+b[i+2]*bw)/oa);o[i+3]=Math.round(oa*255);} return o; };
  const compose = (base, sn, s0) => { const o = Buffer.from(base); for (let i = 0; i < base.length; i += 4) { for (let c = 0; c < 3; c++) { const d = Math.max(0, sn[i+c] - s0[i+c]); o[i+c] = Math.min(255, base[i+c] + d); } } return o; };
  const meanDiff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i]-b[i]) + Math.abs(a[i+1]-b[i+1]) + Math.abs(a[i+2]-b[i+2]) + Math.abs(a[i+3]-b[i+3]); return s / a.length; };

  const explode = (clip) => { const dir = join(work, clip.replace(/[^a-z0-9]/gi, "_")); mkdirSync(dir, { recursive: true }); execFileSync("ffmpeg", ["-v", "error", "-y", "-i", clip, join(dir, "f-%04d.png")], { stdio: "pipe" }); return readdirSync(dir).filter((f) => /^f-\d+\.png$/.test(f)).sort().map((f) => join(dir, f)); };
  const fr = {}; for (const c of [...preClips, postClip]) fr[c] = explode(c);

  // reference geometry = front→nutrition clip's last frame
  { const f = fr[preClips[1]]; const bb = bboxOf(await keyRaw(f[f.length - 1])); TARGET_H = bb.h; TARGET_TOP = bb.top; }
  const norm = {}; for (const c of [...preClips, postClip]) { const f = fr[c]; const bb = bboxOf(await keyRaw(f[f.length - 1])); norm[c] = { s: TARGET_H / bb.h, top: bb.top }; }

  // effective frame range for a clip (seam trim + drop trailing static hold)
  const rangeOf = async (clip, dropHead, dropTail, trimStatic) => {
    const f = fr[clip]; let end = f.length - dropTail;
    if (trimStatic) { const last = await keyRaw(f[end - 1]); while (end - 1 > dropHead + 2 && meanDiff(await keyRaw(f[end - 2]), last) < 2.0) end--; }
    return { start: dropHead, end };
  };

  const producers = [];
  const pushClip = (clip, start, end) => { const nm = norm[clip]; for (let i = start; i < end; i++) { const p = fr[clip][i]; producers.push(async () => normalize(await keyRaw(p), nm.s, nm.top)); } };

  pushClip(preClips[0], 0, fr[preClips[0]].length - opt.seamTail);                       // rest→front
  pushClip(preClips[1], 1 + opt.seamHead, fr[preClips[1]].length - opt.seamTail);        // front→nutrition
  const nb = await rangeOf(preClips[2], 1 + opt.seamHead, opt.seamTail, true);           // nutrition→blank
  pushClip(preClips[2], nb.start, nb.end);
  const baseA = await normalize(await keyRaw(fr[preClips[2]][nb.end - 1]), norm[preClips[2]].s, norm[preClips[2]].top);

  // build the text ON baseA so it matches the can the spin landed on
  const c0 = bboxOf(await keyRaw(cleanStills[0])); const sC = TARGET_H / c0.h;
  const C = []; for (const f of cleanStills) C.push(await normalize(await keyRaw(f), sC, c0.top));
  const B1 = compose(baseA, C[1], C[0]), B2 = compose(baseA, C[2], C[0]), B3 = compose(baseA, C[3], C[0]);

  // build→front clip — its first usable frame is the FLOW dissolve target
  const post = await rangeOf(postClip, 1 + opt.seamHead, 0, true);
  const postFirst = await normalize(await keyRaw(fr[postClip][post.start]), norm[postClip].s, norm[postClip].top);

  const hold = (buf, n) => { for (let k = 0; k < n; k++) producers.push(() => Promise.resolve(buf)); };
  const diss = (a, b, n) => { for (let k = 1; k <= n; k++) { const t = k / (n + 1); producers.push(() => Promise.resolve(blend(a, b, t))); } };
  // Build pacing — deliberately slow so the ingredients cycle in gently as you scroll
  // (the build's share of the frame budget = its share of the scroll).
  hold(baseA, 22);
  diss(baseA, B1, 18); hold(B1, 42);  // + FOR MOMENTS THAT MATTER
  diss(B1, B2, 18); hold(B2, 46);     // + ENERGY
  diss(B2, B3, 18); hold(B3, 46);     // + DRIVE
  diss(B3, postFirst, 18);            // + FLOW, dissolving into the loop-back clip
  pushClip(postClip, post.start, post.end);                                              // build→front

  // sample to count + write AVIF
  const N = producers.length;
  const idxs = Array.from({ length: opt.count }, (_, i) => Math.round((i * (N - 1)) / (opt.count - 1)));
  mkdirSync(opt.out, { recursive: true });
  const previewIdx = new Set([0, 0.13, 0.25, 0.34, 0.5, 0.62, 0.74, 0.82, 0.9, 0.96, 1].map((p) => Math.round(p * (opt.count - 1))));
  const previewTiles = [];
  for (let i = 0; i < idxs.length; i++) {
    const data = await producers[idxs[i]]();
    // Keying/normalization all ran at full W×H so the can is computed identically to
    // the source; downscale only at the final encode (the hero renders at ~400–500px
    // CSS wide, so 960px still covers 2× retina). Aspect is preserved (W:H = 3:4).
    const enc = sharp(data, { raw: { width: W, height: H, channels: 4 } });
    if (opt.outWidth && opt.outWidth < W) enc.resize(opt.outWidth);
    await enc.avif({ quality: opt.quality, effort: 4 }).toFile(join(opt.out, `frame-${String(i).padStart(3, "0")}.avif`));
    if (previewIdx.has(i)) { const tile = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).resize(140, 187, { fit: "contain" }).png().toBuffer(); previewTiles.push({ i, tile }); }
  }
  const cell = 140;
  const svg = Buffer.from(`<svg width="${cell * previewTiles.length}" height="211"><rect width="100%" height="100%" fill="#000"/>${previewTiles.map((t, k) => `<text x="${k * cell + 6}" y="16" font-family="monospace" font-size="12" fill="#fff">f${t.i}</text>`).join("")}</svg>`);
  await sharp(svg).composite(previewTiles.map((t, k) => ({ input: t.tile, left: k * cell, top: 24 }))).png().toFile(join(opt.out, "_contactsheet.png"));
  console.log(`wrote ${opt.count} frames (from ${N} ordered) to ${opt.out}`);
} finally { rmSync(work, { recursive: true, force: true }); }
