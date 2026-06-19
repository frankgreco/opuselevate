// Full /v2 assembly preview (NEW order — three even thirds + loop):
//   rest → front → nutrition → blank(FOR-MOMENTS face) →
//   [FOR MOMENTS THAT MATTER → ENERGY → DRIVE → FLOW build one at a time] → front
// keyed, on black, no float, single clockwise direction. mp4 + strip.
// Usage: node _assemble-full.mjs <outPrefix>
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keyRgbaInPlace } from "../../../scripts/key-greenscreen.mjs";

const outPrefix = process.argv[2];
const W = 624, H = 832;
const G = "assets/can/_work-v2";
const preClips = [
  `${G}/clips/tween1-rest-front.mp4`,        // rest → front (rise)
  `${G}/clips/tween-front-nutrition.mp4`,    // front → nutrition (120° CW)
  `${G}/clips/tween-nutrition-blank.mp4`,    // nutrition → blank FOR-MOMENTS face (120° CW)
];
const buildStills = ["panel-s0", "panel-s1", "panel-s2", "panel-s3", "panel-green"].map((s) => `${G}/glossy/${s}.png`);
const postClips = [
  `${G}/clips/tween-build-front.mp4`,        // FOR MOMENTS panel → front (120° CW)
];

let TARGET_H, TARGET_TOP;
const bboxOf = (buf) => { let mnY = H, mxY = 0, mnX = W, mxX = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (buf[(y*W+x)*4+3] > 60) { if (y<mnY)mnY=y; if(y>mxY)mxY=y; if(x<mnX)mnX=x; if(x>mxX)mxX=x; } } return { top: mnY, h: mxY-mnY }; };
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
const meanDiff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i]-b[i]) + Math.abs(a[i+1]-b[i+1]) + Math.abs(a[i+2]-b[i+2]) + Math.abs(a[i+3]-b[i+3]); return s / (a.length); };

const work = mkdtempSync(join(tmpdir(), "full-"));
const keyRaw = async (f) => { const { data } = await sharp(f).resize(W, H, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); keyRgbaInPlace(data); return data; };
const explode = (clip) => { const dir = join(work, clip.replace(/[^a-z0-9]/gi, "_")); mkdirSync(dir, { recursive: true }); execFileSync("ffmpeg", ["-v", "error", "-y", "-i", clip, join(dir, "f-%04d.png")], { stdio: "pipe" }); return readdirSync(dir).filter((f) => /^f-\d+/.test(f)).sort().map((f) => join(dir, f)); };

// reference geometry = front→nutrition clip's last frame
{ const fr = explode(preClips[1]); const bb = bboxOf(await keyRaw(fr[fr.length - 1])); TARGET_H = bb.h; TARGET_TOP = bb.top; console.log(`target h=${TARGET_H} top=${TARGET_TOP}`); }

const SEAM_HEAD = 1, SEAM_TAIL = 1;
// process a clip → normalized keyed frames; trimStatic drops a long static tail (e.g. the blank hold)
const proc = async (clip, dropHead, dropTail, trimStatic) => {
  const fr = explode(clip);
  const lastBB = bboxOf(await keyRaw(fr[fr.length - 1]));
  const s = TARGET_H / lastBB.h;
  let end = fr.length - dropTail;
  const out = [];
  for (let i = dropHead; i < end; i++) out.push(await normalize(await keyRaw(fr[i]), s, lastBB.top));
  if (trimStatic) { const last = out[out.length - 1]; while (out.length > 2 && meanDiff(out[out.length - 2], last) < 2.0) out.pop(); }
  return out;
};

const frames = [];
frames.push(...await proc(preClips[0], 0, SEAM_TAIL, false));              // rest→front (keep rest start)
frames.push(...await proc(preClips[1], 1 + SEAM_HEAD, SEAM_TAIL, false));  // front→nutrition
const nbFrames = await proc(preClips[2], 1 + SEAM_HEAD, SEAM_TAIL, true);  // nutrition→blank
frames.push(...nbFrames);
const baseA = nbFrames[nbFrames.length - 1];                               // the blank FOR-MOMENTS face the spin landed on

const hold = (buf, n) => { for (let k = 0; k < n; k++) frames.push(buf); };
const diss = (a, b, n) => { for (let k = 1; k <= n; k++) frames.push(blend(a, b, k / (n + 1))); };
// Build the text directly ON baseA so it matches the can the spin landed on (no seam
// flicker): each stage = baseA + the clean text-delta (panel-s_n − panel-s0).
const cleanStills = ["panel-s0", "panel-s1", "panel-s2", "panel-s3"].map((s) => `${G}/glossy/${s}.png`);
const c0 = bboxOf(await keyRaw(cleanStills[0])); const sC = TARGET_H / c0.h;
const C = []; for (const f of cleanStills) C.push(await normalize(await keyRaw(f), sC, c0.top));
const compose = (base, sn, s0) => { const o = Buffer.from(base); for (let i = 0; i < base.length; i += 4) { for (let c = 0; c < 3; c++) { const d = Math.max(0, sn[i+c] - s0[i+c]); o[i+c] = Math.min(255, base[i+c] + d); } } return o; };
const B1 = compose(baseA, C[1], C[0]);  // + FOR MOMENTS THAT MATTER
const B2 = compose(baseA, C[2], C[0]);  // + ENERGY
const B3 = compose(baseA, C[3], C[0]);  // + DRIVE

const postFrames = await proc(postClips[0], 1 + SEAM_HEAD, 0, true);       // build→front clip (full panel → front)

// slow build pacing — ingredients cycle in gently as you scroll
hold(baseA, 22);
diss(baseA, B1, 18); hold(B1, 42);
diss(B1, B2, 18); hold(B2, 46);
diss(B2, B3, 18); hold(B3, 46);
diss(B3, postFrames[0], 18);            // + FLOW, dissolving straight into the clip's first frame (smooth base change)
frames.push(...postFrames);

// render mp4
const outdir = join(work, "out"); mkdirSync(outdir);
for (let i = 0; i < frames.length; i++) await sharp(frames[i], { raw: { width: W, height: H, channels: 4 } }).flatten({ background: "#000" }).png().toFile(join(outdir, "k-" + String(i).padStart(4, "0") + ".png"));
execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "24", "-i", join(outdir, "k-%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", `${outPrefix}-preview.mp4`], { stdio: "pipe" });
// strip
const pick = Array.from({ length: 16 }, (_, k) => Math.round(k * (frames.length - 1) / 15));
const tiles = [];
for (const i of pick) { const b = await sharp(frames[i], { raw: { width: W, height: H, channels: 4 } }).flatten({ background: "#000" }).resize(80, 107, { fit: "contain", background: "#000" }).png().toBuffer(); tiles.push({ i, b }); }
const cell = 80;
const svg = Buffer.from(`<svg width="${cell*tiles.length}" height="126"><rect width="100%" height="100%" fill="#000"/>${tiles.map((t,k)=>`<text x="${k*cell+2}" y="11" font-family="monospace" font-size="8" fill="#0f0">f${t.i}</text>`).join("")}</svg>`);
await sharp(svg).composite(tiles.map((t, k) => ({ input: t.b, left: k * cell, top: 14 }))).png().toFile(`${outPrefix}-strip.png`);
console.log(`wrote ${outPrefix}-preview.mp4 (${frames.length} frames)`);
