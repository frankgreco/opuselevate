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
const opt = { out: "public/can/transparent-spin", count: 240, quality: 58, seamHead: 1, seamTail: 1 };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--out") opt.out = argv[++i];
  else if (argv[i] === "--count") opt.count = Number(argv[++i]);
  else if (argv[i] === "--quality") opt.quality = Number(argv[++i]);
  else if (argv[i] === "--seam-head") opt.seamHead = Number(argv[++i]);
  else if (argv[i] === "--seam-tail") opt.seamTail = Number(argv[++i]);
}

const W = 1248, H = 1664;
const G = "assets/can/_work-v2";
const preClips = [`${G}/clips/tween1-rest-front.mp4`, `${G}/clips/tween-front-nutrition.mp4`, `${G}/clips/tween-nutrition-blank.mp4`];
const blankStill = `${G}/glossy/panel-s0.png`;       // can with NO print — the print-extraction reference
const fullStill = `${G}/anchors/panel-full-r1.png`;  // approved anchor: the full corrected panel printed on the can
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

  // Build the text ON baseA so it matches the can the spin landed on. The three
  // reveal beats are NOT separate stills — they're ONE approved full-panel anchor
  // with progressively more of its printed label un-masked (tagline+ENERGY →
  // +DRIVE → +FLOW). The white print is isolated by differencing the
  // anchor against the blank can in luminance (cancels the matte body, droplets
  // and rims; a threshold drops residual droplet mismatch), then alpha-composited
  // onto baseA. Block boundaries = the widest empty rows in the print's row
  // profile (the inter-block gaps are far larger than the intra-block line gaps).
  const lum = (b, i) => 0.299 * b[i] + 0.587 * b[i + 1] + 0.114 * b[i + 2];
  // Extract the print by differencing the anchor against the blank IN THE BLANK'S
  // OWN geometry (blank kept pristine at scale 1 — never resampled). Differencing
  // in the clip's geometry resampled the blank, so the rims/droplets stopped
  // cancelling and the noise split the ENERGY/DRIVE gap (merging two beats). The
  // boundaries found here map onto baseA 1:1 — blank vs clip can geometry differs
  // by <0.3% (sub-pixel). Temporarily point the shared normalize() at blank space.
  const blankRaw = await keyRaw(blankStill), fullRaw = await keyRaw(fullStill);
  const b0 = bboxOf(blankRaw), bf = bboxOf(fullRaw);
  const _TH = TARGET_H, _TT = TARGET_TOP; TARGET_H = b0.h; TARGET_TOP = b0.top;
  const blankN = await normalize(blankRaw, 1, b0.top);
  const fullN = await normalize(fullRaw, b0.h / bf.h, bf.top);
  TARGET_H = _TH; TARGET_TOP = _TT;
  const T = 55, GAIN = 255 / 120;
  const printMask = new Float32Array(W * H);
  for (let i = 0, p = 0; i < fullN.length; i += 4, p++) { if (fullN[i + 3] < 60) continue; const d = lum(fullN, i) - lum(blankN, i); if (d > T) printMask[p] = Math.min(1, (d - T) * GAIN / 255); }
  const rowSum = new Float32Array(H);
  for (let y = 0; y < H; y++) { let s = 0; for (let x = 0; x < W; x++) s += printMask[y * W + x]; rowSum[y] = s; }
  let pFirst = rowSum.findIndex((v) => v > 2), pLast = H - 1; while (pLast > 0 && rowSum[pLast] <= 2) pLast--;
  const gaps = []; for (let y = pFirst, gs = -1; y <= pLast + 1; y++) { const empty = y > pLast || rowSum[y] <= 2; if (empty && gs < 0) gs = y; else if (!empty && gs >= 0) { gaps.push({ len: y - gs, mid: (gs + y - 1) >> 1 }); gs = -1; } }
  const bounds = [...gaps.sort((a, b) => b.len - a.len).slice(0, 3).map((g) => g.mid).sort((a, b) => a - b), H];
  const revealOnto = (base, yMax) => { const o = Buffer.from(base); for (let p = 0; p < W * H; p++) { if (((p / W) | 0) > yMax) continue; const a = printMask[p]; if (a <= 0) continue; const i = p * 4; for (let c = 0; c < 3; c++) o[i + c] = Math.round(o[i + c] * (1 - a) + 255 * a); } return o; };
  // Three reveal beats: the tagline comes in WITH ENERGY (no standalone tagline
  // beat), then DRIVE, then FLOW. bounds[1]=tagline+ENERGY, [2]=+DRIVE, [3]=+FLOW.
  const Be = revealOnto(baseA, bounds[1]), Bd = revealOnto(baseA, bounds[2]), Bf = revealOnto(baseA, bounds[3]);

  // build→front clip — its first usable frame is the FLOW dissolve target
  const post = await rangeOf(postClip, 1 + opt.seamHead, 0, true);
  const postFirst = await normalize(await keyRaw(fr[postClip][post.start]), norm[postClip].s, norm[postClip].top);

  const hold = (buf, n) => { for (let k = 0; k < n; k++) producers.push(() => Promise.resolve(buf)); };
  const diss = (a, b, n) => { for (let k = 1; k <= n; k++) { const t = k / (n + 1); producers.push(() => Promise.resolve(blend(a, b, t))); } };
  // Build pacing — deliberately slow so the ingredients cycle in gently as you scroll
  // (the build's share of the frame budget = its share of the scroll).
  hold(baseA, 30);
  diss(baseA, Be, 18); hold(Be, 52);  // + FOR MOMENTS THAT MATTER & ENERGY (together)
  diss(Be, Bd, 18); hold(Bd, 52);     // + DRIVE
  diss(Bd, Bf, 18); hold(Bf, 52);     // + FLOW (a still from the same anchor — no longer reliant on the clip)
  diss(Bf, postFirst, 18);            // dissolve into the loop-back rotation clip
  pushClip(postClip, post.start, post.end);                                              // build→front

  // sample to count + write AVIF
  const N = producers.length;
  const idxs = Array.from({ length: opt.count }, (_, i) => Math.round((i * (N - 1)) / (opt.count - 1)));
  mkdirSync(opt.out, { recursive: true });
  const previewIdx = new Set([0, 0.13, 0.25, 0.34, 0.5, 0.62, 0.74, 0.82, 0.9, 0.96, 1].map((p) => Math.round(p * (opt.count - 1))));
  const previewTiles = [];
  for (let i = 0; i < idxs.length; i++) {
    const data = await producers[idxs[i]]();
    await sharp(data, { raw: { width: W, height: H, channels: 4 } }).avif({ quality: opt.quality, effort: 4 }).toFile(join(opt.out, `frame-${String(i).padStart(3, "0")}.avif`));
    if (previewIdx.has(i)) { const tile = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).resize(140, 187, { fit: "contain" }).png().toBuffer(); previewTiles.push({ i, tile }); }
  }
  const cell = 140;
  const svg = Buffer.from(`<svg width="${cell * previewTiles.length}" height="211"><rect width="100%" height="100%" fill="#000"/>${previewTiles.map((t, k) => `<text x="${k * cell + 6}" y="16" font-family="monospace" font-size="12" fill="#fff">f${t.i}</text>`).join("")}</svg>`);
  await sharp(svg).composite(previewTiles.map((t, k) => ({ input: t.tile, left: k * cell, top: 24 }))).png().toFile(join(opt.out, "_contactsheet.png"));
  console.log(`wrote ${opt.count} frames (from ${N} ordered) to ${opt.out}`);
} finally { rmSync(work, { recursive: true, force: true }); }
